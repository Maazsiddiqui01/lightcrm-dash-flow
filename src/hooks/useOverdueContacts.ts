import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PipelineContact {
  to_contact_id: string;
  entity_key: string;
  full_name: string;
  first_name: string;
  organization: string | null;
  to_emails: string;
  cc_emails: string | null;
  is_group: boolean;
  is_overdue: boolean;
  overdue_days: number;
  days_until_due: number;
  urgencyDays: number;
}

export interface UrgencyCategory {
  label: string;
  contacts: PipelineContact[];
  color: 'destructive' | 'warning' | 'secondary';
}

/**
 * Hook to fetch contacts from Email_Pipeline_Contacts_V categorized by urgency:
 * - Overdue (is_overdue = true)
 * - Due in 7 days (days_until_due <= 7)
 * - Due in 14 days (days_until_due <= 14)
 */
export function useOverdueContacts() {
  return useQuery({
    queryKey: ['email-pipeline-urgency'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_pipeline_contacts_v')
        .select('to_contact_id, entity_key, full_name, first_name, organization, to_emails, cc_emails, is_group, is_overdue, overdue_days, days_until_due')
        .order('overdue_days', { ascending: false });
      
      if (error) throw error;
      
      const contacts = (data || []) as Array<{
        to_contact_id: string;
        entity_key: string;
        full_name: string;
        first_name: string;
        organization: string | null;
        to_emails: string;
        cc_emails: string | null;
        is_group: boolean;
        is_overdue: boolean;
        overdue_days: number;
        days_until_due: number;
      }>;
      
      const overdue: PipelineContact[] = [];
      const dueIn7Days: PipelineContact[] = [];
      const dueIn14Days: PipelineContact[] = [];
      
      contacts.forEach(contact => {
        if (contact.is_overdue) {
          overdue.push({ ...contact, urgencyDays: contact.overdue_days });
        } else if (contact.days_until_due <= 7) {
          dueIn7Days.push({ ...contact, urgencyDays: contact.days_until_due });
        } else if (contact.days_until_due <= 14) {
          dueIn14Days.push({ ...contact, urgencyDays: contact.days_until_due });
        }
      });
      
      // Sort: overdue by most days overdue first, due soon by soonest first
      overdue.sort((a, b) => b.urgencyDays - a.urgencyDays);
      dueIn7Days.sort((a, b) => a.urgencyDays - b.urgencyDays);
      dueIn14Days.sort((a, b) => a.urgencyDays - b.urgencyDays);
      
      const categories: UrgencyCategory[] = [
        { label: 'Overdue', contacts: overdue, color: 'destructive' },
        { label: 'Due in 7 Days', contacts: dueIn7Days, color: 'warning' },
        { label: 'Due in 14 Days', contacts: dueIn14Days, color: 'secondary' },
      ];
      
      return categories;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
