import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDistinctFocusAreas() {
  return useQuery({
    queryKey: ['distinct_focus_areas'],
    queryFn: async () => {
      // Get all distinct focus areas from individual columns and comprehensive list
      const { data: contactsData, error } = await supabase
        .from('contacts_raw')
        .select(`
          lg_focus_area_1, lg_focus_area_2, lg_focus_area_3, lg_focus_area_4,
          lg_focus_area_5, lg_focus_area_6, lg_focus_area_7, lg_focus_area_8,
          lg_focus_areas_comprehensive_list
        `);
      
      if (error) throw error;
      
      const focusAreasSet = new Set<string>();
      
      contactsData?.forEach(contact => {
        // Add individual focus areas
        [
          contact.lg_focus_area_1, contact.lg_focus_area_2, contact.lg_focus_area_3,
          contact.lg_focus_area_4, contact.lg_focus_area_5, contact.lg_focus_area_6,
          contact.lg_focus_area_7, contact.lg_focus_area_8
        ].forEach(area => {
          if (area && area.trim()) {
            focusAreasSet.add(area.trim());
          }
        });
        
        // Add from comprehensive list
        if (contact.lg_focus_areas_comprehensive_list) {
          contact.lg_focus_areas_comprehensive_list
            .split(',')
            .forEach(area => {
              const trimmed = area.trim();
              if (trimmed) {
                focusAreasSet.add(trimmed);
              }
            });
        }
      });
      
      return Array.from(focusAreasSet).sort();
    },
  });
}