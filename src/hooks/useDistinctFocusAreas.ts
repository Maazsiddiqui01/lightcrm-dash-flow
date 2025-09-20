import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDistinctFocusAreas() {
  return useQuery({
    queryKey: ['distinct_focus_areas'],
    queryFn: async () => {
      // Use the master table for active focus areas
      const { data, error } = await supabase
        .from('lg_focus_area_master')
        .select('focus_area')
        .eq('is_active', true)
        .order('focus_area', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(d => d.focus_area);
    },
  });
}