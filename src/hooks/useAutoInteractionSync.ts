import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SYNC_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const STORAGE_KEY = 'lastInteractionSync';

/**
 * Hook to automatically sync interactions on app load
 * Throttled to run once every 12 hours
 */
export function useAutoInteractionSync() {
  useEffect(() => {
    const runAutoSync = async () => {
      try {
        const lastSync = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();
        
        // Check if we should run sync (first time or 12+ hours since last sync)
        if (!lastSync || now - parseInt(lastSync) > SYNC_INTERVAL) {
          console.log('[Auto-Sync] Running automatic recency sync...');
          
          const { error } = await supabase.rpc('refresh_all_contact_recency');
          
          if (error) {
            console.error('[Auto-Sync] Failed:', error);
            return;
          }
          
          // Update last sync timestamp
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
