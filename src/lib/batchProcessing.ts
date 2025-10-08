/**
 * Batch Processing Utilities
 * Handles retries, exponential backoff, and concurrency control
 */

import { toast } from '@/hooks/use-toast';

export interface BatchRetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: BatchRetryConfig = {
  maxRetries: 5,
  initialDelay: 200,
  maxDelay: 3000,
  backoffMultiplier: 2,
};

/**
 * Calculates exponential backoff delay
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: BatchRetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber),
    config.maxDelay
  );
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

/**
 * Determines if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return true;
  }
  
  // HTTP status codes
  const status = error.status || error.response?.status;
  if (status) {
    // 429 Too Many Requests - always retry
    if (status === 429) return true;
    
    // 5xx Server Errors - retry
    if (status >= 500 && status < 600) return true;
    
    // 408 Request Timeout - retry
    if (status === 408) return true;
    
    // 4xx Client Errors (except specific ones) - don't retry
    if (status >= 400 && status < 500) return false;
  }
  
  return false;
}

/**
 * Executes function with exponential backoff retry
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: BatchRetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt >= config.maxRetries) {
        break;
      }
      
      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, config);
      onRetry?.(attempt + 1, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Processes items in batches with concurrency control
 */
export async function processBatchWithConcurrency<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
    onItemComplete?: (item: T, result: R) => void;
    onItemError?: (item: T, error: any) => void;
    retryConfig?: BatchRetryConfig;
  } = {}
): Promise<Array<{ item: T; result?: R; error?: any }>> {
  const {
    concurrency = 3,
    onProgress,
    onItemComplete,
    onItemError,
    retryConfig = DEFAULT_RETRY_CONFIG,
  } = options;
  
  const results: Array<{ item: T; result?: R; error?: any }> = [];
  let completed = 0;
  let index = 0;
  
  // Worker function
  const worker = async (): Promise<void> => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      
      try {
        const result = await retryWithBackoff(
          () => processFn(item),
          retryConfig,
          (attempt, error) => {
            console.log(`Retry attempt ${attempt} for item ${currentIndex}:`, error);
          }
        );
        
        results[currentIndex] = { item, result };
        onItemComplete?.(item, result);
      } catch (error: any) {
        results[currentIndex] = { item, error };
        onItemError?.(item, error);
      } finally {
        completed++;
        onProgress?.(completed, items.length);
      }
    }
  };
  
  // Start workers
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  
  return results;
}

/**
 * Creates abort controller for cancellable batch operations
 */
export function createBatchAbortController(): {
  signal: AbortSignal;
  abort: () => void;
  isAborted: () => boolean;
} {
  const controller = new AbortController();
  
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    isAborted: () => controller.signal.aborted,
  };
}
