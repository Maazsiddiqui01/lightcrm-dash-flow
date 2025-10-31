import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to set up real-time synchronization for interactions
 * Listens to changes in emails_meetings_raw and invalidates contact queries
 */
export function useRealtimeInteractionSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Setting up interaction sync...');
    
    const channel = supabase
      .channel('interaction-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emails_meetings_raw'
        },
        async (payload) => {
          console.log('[Realtime] New interaction added, refreshing contacts...', payload);

          // Ask backend to recompute recency for affected contacts based on emails
          const emails = (payload.new as any)?.emails_arr as string[] | null;
          if (emails && emails.length > 0) {
            await supabase.rpc('refresh_contacts_by_emails', { p_emails: emails });
          }
          
          // Invalidate contact-related queries
          queryClient.invalidateQueries({ queryKey: ['contacts-with-opportunities'] });
          queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
          queryClient.invalidateQueries({ queryKey: ['all-contacts-view'] });
          queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
          queryClient.invalidateQueries({ queryKey: ['interaction-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emails_meetings_raw'
        },
        async (payload) => {
          console.log('[Realtime] Interaction updated, refreshing contacts...', payload);

          const emails = (payload.new as any)?.emails_arr as string[] | null;
          if (emails && emails.length > 0) {
            await supabase.rpc('refresh_contacts_by_emails', { p_emails: emails });
          }
          
          // Invalidate contact-related queries
          queryClient.invalidateQueries({ queryKey: ['contacts-with-opportunities'] });
          queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
          queryClient.invalidateQueries({ queryKey: ['all-contacts-view'] });
          queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
          queryClient.invalidateQueries({ queryKey: ['interaction-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'emails_meetings_raw'
        },
        async (payload) => {
          console.log('[Realtime] Interaction deleted, refreshing contacts...', payload);

          const emails = (payload.old as any)?.emails_arr as string[] | null;
          if (emails && emails.length > 0) {
            await supabase.rpc('refresh_contacts_by_emails', { p_emails: emails });
          }
          
          // Invalidate contact-related queries
          queryClient.invalidateQueries({ queryKey: ['contacts-with-opportunities'] });
          queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
          queryClient.invalidateQueries({ queryKey: ['all-contacts-view'] });
          queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
          queryClient.invalidateQueries({ queryKey: ['interaction-stats'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Interaction sync status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up interaction sync...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
