import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to fetch distinct organizations from interactions
 * Used for dynamic dropdown filtering
 */
export function useDistinctOrganizations() {
  return useQuery({
    queryKey: ['distinct-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails_meetings_raw')
        .select('organization')
        .not('organization', 'is', null)
        .order('organization');

      if (error) throw error;

      // Get unique organizations
      const uniqueOrgs = [...new Set(data.map(d => d.organization))].filter(Boolean);
      
      // Return in format expected by ComboboxMulti
      return uniqueOrgs.map(org => ({
        label: org as string,
        value: org as string
      }));
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
