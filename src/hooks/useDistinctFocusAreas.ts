import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDistinctFocusAreas() {
  return useQuery({
    queryKey: ['distinct_focus_areas'],
    queryFn: async () => {
      // Use the new canonical focus areas view that includes all focus areas from the database
      const { data, error } = await supabase
        .from('ui_distinct_focus_areas_v')
        .select('focus_area')
        .order('focus_area');
      
      if (error) throw error;
      
      const focusAreas = data?.map(item => ({
        value: item.focus_area,
        label: item.focus_area
      })).filter(item => Boolean(item.value)) || [];

      // Add HC: (All) as a virtual option for group selection if there are HC focus areas
      const hasHcOptions = focusAreas.some(fa => fa.value.startsWith('HC:'));
      if (hasHcOptions) {
        // Insert HC: (All) after the first HC option for logical grouping
        const hcIndex = focusAreas.findIndex(fa => fa.value.startsWith('HC:'));
        if (hcIndex >= 0) {
          focusAreas.splice(hcIndex, 0, { value: 'HC: (All)', label: 'HC: (All)' });
        }
      }
      
      return focusAreas;
    },
  });
}