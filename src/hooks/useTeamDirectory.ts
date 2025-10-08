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

      // Fetch all contacts to build directory
      const { data: contacts, error } = await supabase
        .from('contacts_raw')
        .select('id, full_name, email_address, lg_lead, lg_assistant')
        .not('email_address', 'is', null);

      if (error) throw error;

      const teamMembers: TeamMember[] = [];
      const seen = new Set<string>();

      contacts?.forEach(contact => {
        // Parse LG Leads (comma-separated)
        if (contact.lg_lead) {
          const leads = contact.lg_lead.split(',').map(l => l.trim()).filter(Boolean);
          leads.forEach(leadName => {
            const key = `lead_${leadName.toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              teamMembers.push({
                id: `lead_${leadName.replace(/\s+/g, '_').toLowerCase()}`,
                name: leadName,
                email: '', // LG Leads don't have email in directory
                role: 'Lead'
              });
            }
          });
        }

        // Parse LG Assistants (comma-separated)
        if (contact.lg_assistant) {
          const assistants = contact.lg_assistant.split(',').map(a => a.trim()).filter(Boolean);
          assistants.forEach(assistantName => {
            const key = `assistant_${assistantName.toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              teamMembers.push({
                id: `assistant_${assistantName.replace(/\s+/g, '_').toLowerCase()}`,
                name: assistantName,
                email: '', // LG Assistants don't have email in directory
                role: 'Assistant'
              });
            }
          });
        }

        // Add colleagues from same email domain
        if (contact.email_address) {
          const contactDomain = contact.email_address.split('@')[1]?.toLowerCase();
          if (contactDomain === emailDomain && contact.full_name) {
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
