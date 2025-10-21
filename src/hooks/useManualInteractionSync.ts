import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Hook to manually trigger interaction sync and group date refresh
 */
export function useManualInteractionSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  const syncNow = async () => {
    setIsSyncing(true);
    
    try {
      console.log('[Manual-Sync] Starting full recency sync...');
      
      // Recompute latest email/meeting and most_recent_contact for all contacts
      const { error: recencyError } = await supabase.rpc('refresh_all_contact_recency');
      
      if (recencyError) {
        console.error('[Manual-Sync] Recency sync failed:', recencyError);
        toast({
          title: "Sync Failed",
          description: "Failed to refresh contact recency. Please try again.",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }
      
      console.log('[Manual-Sync] Contact recency synced successfully');
      
      // Sync all group dates after recency updates
      const { error: groupError } = await supabase.rpc('refresh_all_group_contact_dates');
      
      if (groupError) {
        console.error('[Manual-Sync] Group sync failed:', groupError);
        toast({
          title: "Partial Sync",
          description: "Contact interactions synced, but group dates failed to update.",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }
      
      console.log('[Manual-Sync] Group dates synced successfully');
      
      // Update localStorage to prevent auto-sync for another 12 hours
      localStorage.setItem('lastInteractionSync', Date.now().toString());
      
      toast({
        title: "Sync Complete",
        description: "All contact interactions and group dates have been updated.",
      });
      
      // Reload the page to fetch fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('[Manual-Sync] Unexpected error:', error);
      toast({
        title: "Sync Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return { syncNow, isSyncing };
}
