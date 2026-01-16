import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get emails of group members with 'exclude' role for a given contact's groups.
 * These emails should never appear in To or CC fields.
 */
export function useExcludedEmails(contactId: string | null) {
  return useQuery({
    queryKey: ['excluded-emails', contactId],
    queryFn: async () => {
      if (!contactId) return new Set<string>();

      // First, get all groups this contact belongs to
      const { data: contactGroups, error: groupsError } = await supabase
        .from('contact_group_memberships')
        .select('group_id')
        .eq('contact_id', contactId);

      if (groupsError) throw groupsError;
      if (!contactGroups || contactGroups.length === 0) return new Set<string>();

      const groupIds = contactGroups.map(g => g.group_id);

      // Get all members with 'exclude' role from these groups
      const { data: excludedMembers, error: membersError } = await supabase
        .from('contact_group_memberships')
        .select(`
          contact_id,
          contacts_raw!inner(email_address)
        `)
        .in('group_id', groupIds)
        .eq('email_role', 'exclude');

      if (membersError) throw membersError;

      // Extract and normalize emails
      const excludedEmails = new Set<string>();
      (excludedMembers || []).forEach((member: any) => {
        const email = member.contacts_raw?.email_address;
        if (email) {
          excludedEmails.add(email.toLowerCase().trim());
        }
      });

      return excludedEmails;
    },
    enabled: !!contactId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
