import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDistinctSectors() {
  return useQuery({
    queryKey: ['distinct_lg_sectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ui_distinct_lg_sectors')
        .select('lg_sector')
        .order('lg_sector', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(d => d.lg_sector);
    },
  });
}