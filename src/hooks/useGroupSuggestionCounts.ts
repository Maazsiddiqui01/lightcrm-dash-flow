import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SuggestionMode } from '@/types/groupSuggestion';

export interface SuggestionCounts {
  total: number;
  pending: number;
  approved: number;
  dismissed: number;
}

/**
 * Hook to fetch group suggestion counts by status for a given mode.
 * Used to display summary counts in the suggestion modal header.
 */
export function useGroupSuggestionCounts(mode: SuggestionMode) {
  return useQuery({
    queryKey: ['group-suggestion-counts', mode],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('group_suggestions')
        .select('status')
        .eq('user_id', user.id)
        .eq('mode', mode);

      if (error) throw error;

      const counts: SuggestionCounts = { total: 0, pending: 0, approved: 0, dismissed: 0 };
      for (const row of data || []) {
        const status = row.status as keyof Omit<SuggestionCounts, 'total'>;
        if (status in counts) {
          counts[status]++;
        }
        counts.total++;
      }

      return counts;
    },
  });
}
