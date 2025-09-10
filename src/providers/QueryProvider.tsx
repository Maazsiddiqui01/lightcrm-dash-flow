import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create QueryClient with proper error handling
const createQueryClient = () => {
  try {
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
        },
        mutations: {
          retry: 1,
        },
      },
    });
  } catch (error) {
    console.error('Failed to create QueryClient:', error);
    throw error;
  }
};

const queryClient = createQueryClient();

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  console.log('QueryProvider rendering...');
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('QueryProvider error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Query Provider Error</h2>
        <p>Failed to initialize React Query: {String(error)}</p>
        <div>{children}</div>
      </div>
    );
  }
}