import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FocusAreaMapping {
  focus_area: string;
  sector: string;
  is_active: boolean;
}

export function useFocusAreaSectorMapping() {
  return useQuery({
    queryKey: ['focus_area_sector_mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lg_focus_area_master')
        .select('focus_area, sector, is_active')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Create a Map for efficient lookups
      const mapping = new Map<string, string>();
      data?.forEach((item: FocusAreaMapping) => {
        mapping.set(item.focus_area.toLowerCase().trim(), item.sector);
      });
      
      return mapping;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
}