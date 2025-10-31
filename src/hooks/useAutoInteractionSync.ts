import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const VISIBILITY_THRESHOLD = 60 * 60 * 1000; // 1 hour
const STORAGE_KEY = 'lastInteractionSync';

/**
 * Hook to automatically sync interactions on Contacts page load
 * Throttled to run once every 5 minutes
 * Also syncs when user returns to page after 1+ hour
 */
export function useAutoInteractionSync() {
  const location = useLocation();
  const isContactsPage = location.pathname === '/contacts';
  
  useEffect(() => {
    const runAutoSync = async () => {
      try {
        const lastSync = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();
        
        // Always sync if on contacts page and hasn't synced recently
        if (isContactsPage && (!lastSync || now - parseInt(lastSync) > SYNC_INTERVAL)) {
          console.log('[Auto-Sync] Running automatic recency sync...');
          
          const { error } = await supabase.rpc('refresh_all_contact_recency');
          
          if (error) {
            console.error('[Auto-Sync] Failed:', error);
            return;
          }
          
          localStorage.setItem(STORAGE_KEY, now.toString());
          console.log('[Auto-Sync] Completed successfully');
        }
      } catch (error) {
        console.error('[Auto-Sync] Error:', error);
      }
    };

    // Run sync after a short delay to not block initial load
    const timeout = setTimeout(runAutoSync, 2000);
    
    // Page Visibility API - sync when user returns after being away
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isContactsPage) {
        const lastSync = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();
        
        if (!lastSync || now - parseInt(lastSync) > VISIBILITY_THRESHOLD) {
          runAutoSync();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isContactsPage]);
}
