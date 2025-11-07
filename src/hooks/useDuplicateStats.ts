import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DuplicateStats {
  totalCount: number;
  highPriorityCount: number;
  activeGroups: number;
}

export function useDuplicateStats() {
  return useQuery({
    queryKey: ['duplicate-stats'],
    queryFn: async (): Promise<DuplicateStats> => {
      const { data, error } = await supabase
        .from('contact_duplicates')
        .select('user_count, status')
        .eq('status', 'active');

      if (error) throw error;

      const totalCount = data?.reduce((sum, dup) => sum + (dup.user_count || 0), 0) || 0;
      const activeGroups = data?.length || 0;
      // High priority = 3+ contacts with same email
      const highPriorityCount = data?.filter(dup => dup.user_count >= 3).length || 0;

      return {
        totalCount,
        highPriorityCount,
        activeGroups,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
