import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useGroupContacts = () => {
  return useQuery({
    queryKey: ['group-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts_raw')
        .select('group_contact')
        .not('group_contact', 'is', null)
        .order('group_contact');
      
      if (error) throw error;
      
      const uniqueGroups = [...new Set(data?.map(item => item.group_contact).filter(Boolean))];
      return uniqueGroups.map(group => ({ 
        value: group, 
        label: group 
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};