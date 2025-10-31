import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'lastInteractionSync';

/**
 * Hook to automatically sync interactions on app load
 * Throttled to run once every 5 minutes
 */
export function useAutoInteractionSync() {
  useEffect(() => {
    const runAutoSync = async () => {
      try {
        const lastSync = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();
        
        // Run sync if hasn't synced recently
        if (!lastSync || now - parseInt(lastSync) > SYNC_INTERVAL) {
          console.log('[Auto-Sync] Running automatic recency sync...');
          
          const { error } = await supabase.rpc('refresh_all_contact_recency');
          
          if (error) {
            console.error('[Auto-Sync] Failed:', error);
            return;
          }
          
          localStorage.setItem(STORAGE_KEY, now.toString());
          console.log('[Auto-Sync] Completed successfully');
        } else {
          const nextSync = new Date(parseInt(lastSync) + SYNC_INTERVAL);
          console.log('[Auto-Sync] Skipping, next sync at:', nextSync.toLocaleString());
        }
      } catch (error) {
        console.error('[Auto-Sync] Error:', error);
      }
    };

    // Run sync after a short delay to not block initial load
    const timeout = setTimeout(runAutoSync, 2000);
    
    return () => clearTimeout(timeout);
  }, []);
}
