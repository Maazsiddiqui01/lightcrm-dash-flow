import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GroupMember {
  id: string;
  email_address: string;
  full_name: string;
  group_email_role: string | null;
  most_recent_contact: string | null;
}

export function useGroupMembers(groupName: string | null | undefined) {
  return useQuery({
    queryKey: ['group-members', groupName],
    queryFn: async () => {
      if (!groupName) return { to: [], cc: [], bcc: [], all: [] };

      const { data, error } = await supabase
        .from('contacts_raw')
        .select('id, email_address, full_name, group_email_role, most_recent_contact')
        .eq('group_contact', groupName);

      if (error) throw error;

      const members = data || [];
      return {
        to: members.filter(m => m.group_email_role === 'to'),
        cc: members.filter(m => m.group_email_role === 'cc'),
        bcc: members.filter(m => m.group_email_role === 'bcc'),
        all: members,
      };
    },
    enabled: !!groupName,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
