import { useEffect } from 'react';
import { useRefreshMissingContacts } from './useMissingContacts';

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = 'lastMissingContactsRefresh';

export function useAutoRefreshMissingContacts() {
  const refreshMutation = useRefreshMissingContacts();

  useEffect(() => {
    const runRefresh = async () => {
      const lastRefresh = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();
      
      // Run if never refreshed or last refresh was > 30 minutes ago
      if (!lastRefresh || now - parseInt(lastRefresh) > REFRESH_INTERVAL) {
        console.log('[Auto-Refresh] Running missing contacts scan...');
        try {
          await refreshMutation.mutateAsync();
          localStorage.setItem(STORAGE_KEY, now.toString());
          console.log('[Auto-Refresh] Scan completed successfully');
        } catch (error) {
          console.error('[Auto-Refresh] Scan failed:', error);
        }
      }
    };

    // Run on mount (after 5 second delay to not block initial load)
    const mountTimeout = setTimeout(runRefresh, 5000);
    
    // Set up interval for periodic checks
    const interval = setInterval(runRefresh, REFRESH_INTERVAL);

    return () => {
      clearTimeout(mountTimeout);
      clearInterval(interval);
    };
  }, [refreshMutation]);
}
