import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const useTeamDirectory = (contactEmail?: string) => {
  return useQuery({
    queryKey: ['team-directory', contactEmail],
    queryFn: async () => {
      if (!contactEmail) return [];

      const emailDomain = contactEmail.split('@')[1]?.toLowerCase();
      if (!emailDomain) return [];

      const teamMembers: TeamMember[] = [];
      const seen = new Set<string>();

      // Fetch LG Focus Area Directory for Leads and Assistants with emails
      const { data: directory, error: dirError } = await supabase
        .from('lg_focus_area_directory')
        .select('focus_area, lead1_name, lead1_email, lead2_name, lead2_email, assistant_name, assistant_email');

      if (dirError) throw dirError;

      // Process directory data to get unique leads and assistants
      directory?.forEach(entry => {
        // Add Lead 1
        if (entry.lead1_name && entry.lead1_email) {
          const key = `lead_${entry.lead1_email.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            teamMembers.push({
              id: key,
              name: entry.lead1_name,
              email: entry.lead1_email,
              role: 'Lead'
            });
          }
        }

        // Add Lead 2
        if (entry.lead2_name && entry.lead2_email) {
          const key = `lead_${entry.lead2_email.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            teamMembers.push({
              id: key,
              name: entry.lead2_name,
              email: entry.lead2_email,
              role: 'Lead'
            });
          }
        }

        // Add Assistant
        if (entry.assistant_name && entry.assistant_email) {
          const key = `assistant_${entry.assistant_email.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            teamMembers.push({
              id: key,
              name: entry.assistant_name,
              email: entry.assistant_email,
              role: 'Assistant'
            });
          }
        }
      });

      // Fetch colleagues from same email domain
      const { data: contacts, error } = await supabase
        .from('contacts_raw')
        .select('id, full_name, email_address')
        .not('email_address', 'is', null)
        .ilike('email_address', `%@${emailDomain}`);

      if (error) throw error;

      contacts?.forEach(contact => {
        if (contact.full_name && contact.email_address) {
          const key = `colleague_${contact.email_address.toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            teamMembers.push({
              id: contact.id,
              name: contact.full_name,
              email: contact.email_address,
              role: 'Colleague'
            });
          }
        }
      });

      // Sort: Leads first, then Assistants, then Colleagues
      return teamMembers.sort((a, b) => {
        const roleOrder = { Lead: 0, Assistant: 1, Colleague: 2 };
        const orderA = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
        const orderB = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
        
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
    },
    enabled: !!contactEmail,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
