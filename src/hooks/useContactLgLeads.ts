import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Option {
  value: string;
  label: string;
}

export const useContactLgLeads = (search?: string) => {
  return useQuery({
    queryKey: ['contact-lg-leads', search],
    queryFn: async () => {
      let query = supabase
        .from('contacts_raw')
        .select('lg_lead', { head: false })
        .not('lg_lead', 'is', null)
        .neq('lg_lead', '');
      
      if (search) {
        query = query.ilike('lg_lead', `%${search}%`);
      }
      
      const { data, error } = await query.order('lg_lead').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      
      // Parse comma-separated values from lg_lead field
      (data || []).forEach(row => {
        const leadsList = row.lg_lead?.toString().trim();
        if (leadsList) {
          // Split by comma and clean each lead name
          const leads = leadsList.split(',').map(lead => lead.trim()).filter(lead => lead.length > 0);
          leads.forEach(lead => uniqueValues.add(lead));
        }
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};