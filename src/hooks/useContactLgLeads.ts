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
        .from('lg_leads_directory')
        .select('lead_name')
        .order('lead_name');
      
      if (search) {
        query = query.ilike('lead_name', `%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(row => ({ 
        value: row.lead_name, 
        label: row.lead_name 
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
};
