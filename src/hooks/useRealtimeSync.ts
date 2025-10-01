import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to set up real-time synchronization for library tables
 * Listens to changes in phrase_library, inquiry_library, subject_library, and signature_library
 * and invalidates related queries to keep UI in sync
 */
export function useRealtimeLibrarySync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a single channel for all library table changes
    const channel = supabase
      .channel('library-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'phrase_library'
        },
        () => {
          console.log('[Realtime] Phrase library changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['phrase-library'] });
          queryClient.invalidateQueries({ queryKey: ['email-builder'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inquiry_library'
        },
        () => {
          console.log('[Realtime] Inquiry library changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['inquiry-library'] });
          queryClient.invalidateQueries({ queryKey: ['email-builder'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subject_library'
        },
        () => {
          console.log('[Realtime] Subject library changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['subject-library'] });
          queryClient.invalidateQueries({ queryKey: ['email-builder'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signature_library'
        },
        () => {
          console.log('[Realtime] Signature library changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['signature-library'] });
          queryClient.invalidateQueries({ queryKey: ['email-builder'] });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
