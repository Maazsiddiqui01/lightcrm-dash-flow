import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useContactGroupInfo(contactId: string | null) {
  return useQuery({
    queryKey: ['contact-group-info', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from('contacts_raw')
        .select('group_contact, most_recent_group_contact, delta, full_name')
        .eq('id', contactId)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
    enabled: !!contactId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
