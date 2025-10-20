import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ContactGroup {
  group_id: string;
  group_name: string;
  email_role: 'to' | 'cc' | 'bcc' | null;
  max_lag_days: number | null;
  focus_area: string | null;
  sector: string | null;
}

export function useContactGroups(contactId: string | null) {
  return useQuery({
    queryKey: ['contact-groups', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase.rpc('get_contact_groups', {
        p_contact_id: contactId
      });

      if (error) throw error;
      return data as ContactGroup[];
    },
    enabled: !!contactId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
