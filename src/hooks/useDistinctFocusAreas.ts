import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDistinctFocusAreas() {
  return useQuery({
    queryKey: ['distinct_focus_areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ui_distinct_focus_areas')
        .select('focus_area')
        .order('focus_area', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(d => d.focus_area);
    },
  });
}