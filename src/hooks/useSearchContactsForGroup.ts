import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SearchContactResult {
  id: string;
  full_name: string;
  email_address: string;
  organization: string | null;
  title: string | null;
  most_recent_contact: string | null;
}

export function useSearchContactsForGroup(
  searchTerm: string,
  groupId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['search-contacts-for-group', groupId, searchTerm],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase.rpc('search_contacts_for_group', {
        p_search_term: searchTerm || null,
        p_exclude_group_id: groupId,
        p_limit: 50
      });

      if (error) throw error;
      return (data || []) as SearchContactResult[];
    },
    enabled: enabled && !!groupId,
    staleTime: 1000 * 30, // 30 seconds
  });
}
