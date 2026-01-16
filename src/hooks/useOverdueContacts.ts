import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AllContactView } from '@/hooks/useAllContactsView';

export interface UrgencyContact extends AllContactView {
  urgencyDays: number;
}

export interface UrgencyCategory {
  label: string;
  contacts: UrgencyContact[];
  color: 'destructive' | 'warning' | 'secondary';
}

/**
 * Hook to fetch contacts categorized by urgency:
 * - Overdue (days_over_under_max_lag < 0)
 * - Due in 7 days (0 <= days <= 7)
 * - Due in 14 days (7 < days <= 14)
 */
export function useOverdueContacts() {
  return useQuery({
    queryKey: ['overdue-contacts-urgency'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_contacts_view');
      
      if (error) throw error;
      
      const contacts = (data || []) as AllContactView[];
      
      // Categorize by urgency
      const overdue: UrgencyContact[] = [];
      const dueIn7Days: UrgencyContact[] = [];
      const dueIn14Days: UrgencyContact[] = [];
      
      contacts.forEach(contact => {
        const daysRemaining = contact.days_over_under_max_lag;
        
        // Skip contacts without urgency data
        if (daysRemaining === null || daysRemaining === undefined) return;
        
        if (daysRemaining < 0) {
          // Overdue - negative days means past due
          overdue.push({ 
            ...contact, 
            urgencyDays: Math.abs(daysRemaining) 
          });
        } else if (daysRemaining <= 7) {
          // Due within next 7 days
          dueIn7Days.push({ 
            ...contact, 
            urgencyDays: daysRemaining 
          });
        } else if (daysRemaining <= 14) {
          // Due within next 14 days
          dueIn14Days.push({ 
            ...contact, 
            urgencyDays: daysRemaining 
          });
        }
      });
      
      // Sort each category by urgency (most urgent first)
      overdue.sort((a, b) => b.urgencyDays - a.urgencyDays); // Most overdue first
      dueIn7Days.sort((a, b) => a.urgencyDays - b.urgencyDays); // Soonest due first
      dueIn14Days.sort((a, b) => a.urgencyDays - b.urgencyDays); // Soonest due first
      
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
