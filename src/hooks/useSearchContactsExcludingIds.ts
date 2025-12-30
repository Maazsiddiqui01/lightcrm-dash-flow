import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactSearchResult {
  id: string;
  full_name: string | null;
  email_address: string | null;
  organization: string | null;
  title: string | null;
}

export function useSearchContactsExcludingIds(
  searchTerm: string,
  excludeIds: string[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['search-contacts-excluding', searchTerm, excludeIds],
    queryFn: async () => {
      let query = supabase
        .from('contacts_raw')
        .select('id, full_name, email_address, organization, title')
        .or(`full_name.ilike.%${searchTerm}%,email_address.ilike.%${searchTerm}%,organization.ilike.%${searchTerm}%`)
        .limit(10);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ContactSearchResult[];
    },
    enabled: enabled && searchTerm.length >= 2,
  });
}
