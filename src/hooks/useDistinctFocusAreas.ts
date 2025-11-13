import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical hook for fetching focus areas.
 * Primary source: lookup_focus_areas (curated list with sector relationships)
 * Fallback: ui_distinct_focus_areas_v (union of all focus areas from data)
 */
export function useDistinctFocusAreas() {
  return useQuery({
    queryKey: ['distinct_focus_areas'],
    queryFn: async () => {
      // Try lookup_focus_areas first (canonical source)
      const { data: lookupData, error: lookupError } = await supabase
        .from('lookup_focus_areas')
        .select('label')
        .order('label');
      
      let focusAreas: Array<{ value: string; label: string }> = [];
      
      if (!lookupError && lookupData && lookupData.length > 0) {
        focusAreas = lookupData.map(item => ({
          value: item.label,
          label: item.label
        }));
      } else {
        console.warn('lookup_focus_areas empty or failed, falling back to ui_distinct_focus_areas_v');
        
        // Fallback to ui_distinct_focus_areas_v
        const { data: viewData, error: viewError } = await supabase
          .from('ui_distinct_focus_areas_v')
          .select('focus_area')
          .order('focus_area');
        
        if (viewError) throw viewError;
        
        focusAreas = (viewData || [])
          .map(item => ({
            value: item.focus_area,
            label: item.focus_area
          }))
          .filter(item => Boolean(item.value));
      }

      // Add HC: (All) as a virtual option for group selection if there are HC focus areas
      const hasHcOptions = focusAreas.some(fa => fa.value.startsWith('HC:'));
      if (hasHcOptions) {
        const hcIndex = focusAreas.findIndex(fa => fa.value.startsWith('HC:'));
        if (hcIndex >= 0) {
          focusAreas.splice(hcIndex, 0, { value: 'HC: (All)', label: 'HC: (All)' });
        }
      }
      
      return focusAreas;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}