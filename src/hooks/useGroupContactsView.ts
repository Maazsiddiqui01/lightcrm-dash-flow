import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GroupContactView } from '@/types/contact';

export function useGroupContactsView() {
  return useQuery({
    queryKey: ['group-contacts-view'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_group_contacts_view');
      
      if (error) throw error;
      
      // Map the database result to our TypeScript interface
      return ((data || []) as any[]).map(item => ({
        ...item,
        members: Array.isArray(item.members) ? item.members : JSON.parse(item.members || '[]')
      })) as GroupContactView[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
