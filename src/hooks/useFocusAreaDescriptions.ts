import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FocusAreaDescription {
  focus_area: string;
  description: string;
  platform_type: string;
  sector: string;
}

export function useFocusAreaDescriptions(focusAreas: string[]) {
  return useQuery({
    queryKey: ['focus_area_descriptions', focusAreas],
    queryFn: async (): Promise<FocusAreaDescription[]> => {
      if (!focusAreas || focusAreas.length === 0) return [];

      // Check if "General BD" is in the focus areas
      const hasGeneralBD = focusAreas.some(area => 
        area.toLowerCase().includes('general bd') || 
        area.toLowerCase().includes('general business development')
      );

      let query = supabase
        .from('focus_area_description')
        .select('*');

      if (hasGeneralBD) {
        // For General BD, return all rows for any matching focus area
        query = query.in('LG Focus Area', focusAreas);
      } else {
        // For other focus areas, only return "New Platform" records
        query = query
          .in('LG Focus Area', focusAreas)
          .eq('Platform / Add-On', 'New Platform');
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching focus area descriptions:', error);
        return [];
      }

      // Transform the data to match our interface
      return (data || []).map(item => ({
        focus_area: item['LG Focus Area'] || '',
        description: item['Description'] || '',
        platform_type: item['Platform / Add-On'] || '',
        sector: item['LG Sector'] || ''
      }));
    },
    enabled: focusAreas && focusAreas.length > 0,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}