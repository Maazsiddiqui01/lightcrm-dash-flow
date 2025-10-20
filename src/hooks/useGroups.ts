import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Group } from '@/types/group';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Group[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
