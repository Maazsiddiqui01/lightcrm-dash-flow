import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RequestState {
  isLoading: boolean;
  isProcessing: boolean;
  startTime?: number;
  requestId?: string;
  error?: string;
  data?: any;
}

interface AsyncResponse {
  jobId?: string;
  job_id?: string;
  status?: string;
}

interface RequestOptions {
  timeout?: number;
  maxRetries?: number;
  pollingInterval?: number;
  maxPollingTime?: number;
}

const DEFAULT_OPTIONS: RequestOptions = {
  timeout: 120000, // 2 minutes
  maxRetries: 3,
  pollingInterval: 2000, // 2 seconds
  maxPollingTime: 240000, // 4 minutes
};

export function useResilientRequest(baseUrl: string, options: RequestOptions = {}) {
  const [state, setState] = useState<RequestState>({
    isLoading: false,
    isProcessing: false,
  });
  
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController>();
  const pollingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const generateRequestId = () => Math.random().toString(36).substring(2, 15);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const calculateBackoff = (attempt: number, baseMs: number = 1000) => {
    const backoff = Math.min(baseMs * Math.pow(2, attempt), 10000);
    const jitter = Math.random() * 0.1 * backoff;
    return backoff + jitter;
  };

  const shouldRetry = (status: number, attempt: number): boolean => {
    if (attempt >= opts.maxRetries!) return false;
    return [408, 425, 429, 500, 502, 503, 504, 522, 524].includes(status);
  };

  const isAsyncResponse = (data: any): data is AsyncResponse => {
    return data && (data.jobId || data.job_id) && typeof data.status === 'string';
  };

  const normalizeResponse = (data: any) => {
    // Handle different response shapes
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && typeof data === 'object') return [data];
    return [];
  };

  const pollForResults = async (jobId: string, requestId: string): Promise<any> => {
    const startTime = Date.now();
    let pollInterval = opts.pollingInterval!;
    let attempt = 0;

    while (Date.now() - startTime < opts.maxPollingTime!) {
      // Check if request was cancelled
      if (state.requestId !== requestId) {
        throw new Error('Request cancelled');
      }

      try {
        const response = await fetch(`${baseUrl}/status/${jobId}`, {
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const pollData = await response.json();
        
        if (pollData.status === 'done' || Array.isArray(pollData)) {
          return Array.isArray(pollData) ? pollData : pollData.data || pollData;
        }
        
        if (pollData.status === 'error') {
          throw new Error(pollData.message || 'Job failed');
        }

        // Increase polling interval after 30 seconds
        if (Date.now() - startTime > 30000) {
          pollInterval = 5000;
        }

        await delay(pollInterval);
        attempt++;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        
        // Retry polling with backoff
        await delay(calculateBackoff(attempt, 2000));
        attempt++;
      }
    }

    throw new Error('Polling timeout exceeded');
  };

  const executeRequest = async (payload: any, requestId: string): Promise<any> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
      try {
        if (state.requestId !== requestId) {
          throw new Error('Request cancelled');
        }

        // Create new AbortController for each attempt
        abortControllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, opts.timeout);

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...payload, requestId }),
          signal: abortControllerRef.current.signal,
        });

        clearTimeout(timeoutId);

        // Handle retry-worthy status codes
        if (!response.ok && shouldRetry(response.status, attempt)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let data;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json') || contentType.includes('text/')) {
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = { message: text };
          }
        } else {
          data = await response.json();
        }

        // Check if this is an async response that requires polling
        if (response.status === 202 || isAsyncResponse(data)) {
          const jobId = data.jobId || data.job_id;
          if (!jobId) {
            throw new Error('Async response missing job ID');
          }
          
          setState(prev => ({ ...prev, isProcessing: true }));
          return await pollForResults(jobId, requestId);
        }

        return normalizeResponse(data);

      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        if (attempt < opts.maxRetries!) {
          await delay(calculateBackoff(attempt));
          continue;
        }
        
        throw lastError;
      }
    }

    throw lastError || new Error('Request failed after all retries');
  };

  const cancel = useCallback(() => {
    setState(prev => ({ ...prev, requestId: undefined }));
    abortControllerRef.current?.abort();
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
  }, []);

  const submit = useCallback(async (payload: any) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    setState({
      isLoading: true,
      isProcessing: false,
      startTime,
      requestId,
      error: undefined,
      data: undefined,
    });

    // Show long-running toast after 20 seconds
    const longRunningToast = setTimeout(() => {
      if (state.requestId === requestId) {
        toast({
          title: "Still working...",
          description: "This can take up to 1-2 minutes. Please wait.",
          duration: 5000,
        });
      }
    }, 20000);

    try {
      const data = await executeRequest(payload, requestId);
      
      clearTimeout(longRunningToast);
      
      if (state.requestId === requestId) {
        setState({
          isLoading: false,
          isProcessing: false,
          startTime: undefined,
          requestId: undefined,
          error: undefined,
          data,
        });
        
        return data;
      }
    } catch (error) {
      clearTimeout(longRunningToast);
      
      if (state.requestId === requestId && error instanceof Error && error.name !== 'AbortError') {
        const duration = Date.now() - startTime;
        const errorMessage = error.message;
        
        setState({
          isLoading: false,
          isProcessing: false,
          startTime: undefined,
          requestId: undefined,
          error: errorMessage,
          data: undefined,
        });
        
        return {
          error: {
            message: errorMessage,
            duration: Math.round(duration / 1000),
            url: baseUrl,
            method: 'POST',
          }
        };
      }
    }
  }, [baseUrl, opts, toast, state.requestId]);

  const getElapsedTime = useCallback(() => {
    if (!state.startTime) return 0;
    return Math.round((Date.now() - state.startTime) / 1000);
  }, [state.startTime]);

  return {
    ...state,
    submit,
    cancel,
    getElapsedTime,
  };
}