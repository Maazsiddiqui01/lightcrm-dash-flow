import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AllContactView {
  id: string;
  contact_type: 'individual' | 'group';
  name: string;
  max_lag_days: number | null;
  most_recent_contact: string | null;
  next_outreach_date: string | null;
  days_since_last_contact: number | null;
  days_over_under_max_lag: number | null;
  is_overdue: boolean;
  focus_area: string | null;
  sector: string | null;
  opportunities: string | null;
  opportunity_count: number;
  organization: string | null;  // Only for individuals
  title: string | null;          // Only for individuals
  member_count: number | null;   // Only for groups
  member_names: string | null;   // Only for groups
  assigned_to: string | null;
  created_by: string | null;
}

export function useAllContactsView() {
  return useQuery({
    queryKey: ['all-contacts-view'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_contacts_view');
      
      if (error) throw error;
      
      return (data || []) as AllContactView[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
