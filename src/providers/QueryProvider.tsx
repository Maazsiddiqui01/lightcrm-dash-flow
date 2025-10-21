import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAutoInteractionSync } from '@/hooks/useAutoInteractionSync';
import { useRealtimeInteractionSync } from '@/hooks/useRealtimeInteractionSync';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  console.log('QueryProvider rendering...');
  
  // Create QueryClient directly in the component to ensure it's available
  const queryClient = React.useMemo(() => {
    console.log('Creating QueryClient in useMemo...');
    try {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
          mutations: {
            retry: 1,
          },
        },
      });
      console.log('QueryClient created successfully:', client);
      return client;
    } catch (error) {
      console.error('Failed to create QueryClient:', error);
      return null;
    }
  }, []);
  
  console.log('QueryProvider queryClient:', queryClient);
  
  if (!queryClient) {
    console.error('QueryClient is null!');
    return (
      <div style={{ padding: '20px', color: 'red', backgroundColor: 'pink' }}>
        <h2>Query Client Error</h2>
        <p>Failed to create QueryClient</p>
        {children}
      </div>
    );
  }
  
  try {
    console.log('Rendering QueryClientProvider with client:', queryClient);
    return (
      <QueryClientProvider client={queryClient}>
        <SyncWrapper>{children}</SyncWrapper>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('QueryProvider error:', error);
    return (
      <div style={{ padding: '20px', color: 'red', backgroundColor: 'lightcoral' }}>
        <h2>Query Provider Error</h2>
        <p>Failed to initialize React Query: {String(error)}</p>
        <div>{children}</div>
      </div>
    );
  }
}

/**
 * Wrapper component to enable sync hooks after QueryClient is available
 */
function SyncWrapper({ children }: { children: React.ReactNode }) {
  useAutoInteractionSync();
  useRealtimeInteractionSync();
  return <>{children}</>;
}