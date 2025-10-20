import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to fetch all groups for filter dropdowns
 * Uses the new groups table instead of legacy group_contact field
 */
export const useGroupContacts = () => {
  return useQuery({
    queryKey: ['groups-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      return data.map(group => ({ 
        value: group.id,
        label: group.name 
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};