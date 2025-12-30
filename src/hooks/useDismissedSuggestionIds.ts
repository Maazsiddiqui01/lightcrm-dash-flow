import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SuggestionMode } from '@/types/groupSuggestion';

/**
 * Hook to fetch dismissed suggestion IDs for a given mode.
 * Used to filter out previously dismissed suggestions during re-analysis.
 */
export function useDismissedSuggestionIds(mode: SuggestionMode) {
  return useQuery({
    queryKey: ['dismissed-suggestion-ids', mode],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('group_suggestions')
        .select('suggestion_id')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .eq('status', 'dismissed');

      if (error) throw error;
      return new Set((data || []).map(s => s.suggestion_id));
    },
  });
}

/**
 * Fetch dismissed suggestion IDs directly (non-hook version for use in callbacks)
 */
export async function fetchDismissedSuggestionIds(mode: SuggestionMode): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('group_suggestions')
    .select('suggestion_id')
    .eq('user_id', user.id)
    .eq('mode', mode)
    .eq('status', 'dismissed');

  if (error) {
    console.error('Error fetching dismissed suggestions:', error);
    return new Set();
  }

  return new Set((data || []).map(s => s.suggestion_id));
}
