import { supabase } from "@/integrations/supabase/client";

interface EdgeInvokeOptions {
  timeoutMs?: number;
  expectStream?: boolean;
}

interface EdgeError extends Error {
  code?: string;
  details?: any;
  correlationId?: string;
  status?: number;
}

/**
 * Safe wrapper for supabase.functions.invoke with:
 * - Correlation ID tracking
 * - Timeout handling
 * - Consistent error responses
 * - Detailed logging
 */
export async function edgeInvoke<T = any>(
  functionName: string,
  body: any = {},
  options: EdgeInvokeOptions = {}
): Promise<T> {
  const correlationId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const timeoutMs = options.timeoutMs || 30000; // 30s default
  
  console.log(`[edgeInvoke] Calling ${functionName}`, {
    correlationId,
    body: body ? Object.keys(body) : [],
    timeoutMs
  });

  // Set up timeout using Promise.race
  const invokePromise = supabase.functions.invoke(functionName, {
    body: { ...body, correlationId },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    // Check for Supabase SDK-level errors
    if (error) {
      const err = new Error(error.message || `Edge function ${functionName} failed`) as EdgeError;
      err.code = 'EDGE_FUNCTION_ERROR';
      err.details = error;
      err.correlationId = correlationId;
      
      console.error(`[edgeInvoke] ${functionName} failed (SDK error)`, {
        correlationId,
        error
      });
      
      throw err;
    }

    // Check for function-level errors in response body
    if (data && typeof data === 'object' && 'error' in data) {
      const err = new Error(data.error || `${functionName} returned an error`) as EdgeError;
      err.code = data.code || 'FUNCTION_ERROR';
      err.details = data.details;
      err.correlationId = correlationId;
      err.status = data.status;
      
      console.error(`[edgeInvoke] ${functionName} failed (function error)`, {
        correlationId,
        error: data
      });
      
      throw err;
    }

    console.log(`[edgeInvoke] ${functionName} succeeded`, {
      correlationId,
      hasData: !!data
    });

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Timeout')) {
      const err = new Error(`${functionName} timed out after ${timeoutMs}ms`) as EdgeError;
      err.code = 'TIMEOUT';
      err.correlationId = correlationId;
      
      console.error(`[edgeInvoke] ${functionName} timed out`, {
        correlationId,
        timeoutMs
      });
      
      throw err;
    }

    // Re-throw EdgeError with correlation ID
    if ((error as EdgeError).correlationId) {
      throw error;
    }

    // Wrap unknown errors
    const err = new Error(
      error instanceof Error ? error.message : `Unknown error calling ${functionName}`
    ) as EdgeError;
    err.code = 'UNKNOWN_ERROR';
    err.correlationId = correlationId;
    err.details = error;
    
    console.error(`[edgeInvoke] ${functionName} unknown error`, {
      correlationId,
      error
    });
    
    throw err;
  }
}

/**
 * Format edge function error for user display
 */
export function formatEdgeError(error: unknown, functionName: string): string {
  if (error && typeof error === 'object' && 'correlationId' in error) {
    const edgeError = error as EdgeError;
    const id = edgeError.correlationId?.substring(0, 8);
    return `${functionName} failed - ${edgeError.message} (id: ${id})`;
  }
  
  if (error instanceof Error) {
    return `${functionName} failed - ${error.message}`;
  }
  
  return `${functionName} failed - Unknown error`;
}
