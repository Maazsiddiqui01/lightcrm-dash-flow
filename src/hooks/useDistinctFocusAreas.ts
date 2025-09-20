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
      
      return data?.map(item => item.focus_area).filter(Boolean) || [];
    },
  });
}