import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useContactTopOpps(contactId: string | null) {
  return useQuery({
    queryKey: ['contact_top_opps', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      // Direct opportunities query since view might not exist
      try {
        
        // Get contact name first
        const { data: contact } = await supabase
          .from('contacts_raw')
          .select('full_name')
          .eq('id', contactId)
          .single();
        
        if (!contact?.full_name) return [];
        
        const { data, error } = await supabase
          .from('opportunities_raw')
          .select('id, deal_name, ebitda_in_ms, deal_source_individual_1, deal_source_individual_2')
          .or(`deal_source_individual_1.ilike.%${contact.full_name}%,deal_source_individual_2.ilike.%${contact.full_name}%`)
          .order('ebitda_in_ms', { ascending: false })
          .limit(3);
        
        if (error) throw error;
        
        // Add row number for consistency
        return (data || []).map((item, index) => ({
          ...item,
          rn: index + 1,
          contact_id: contactId
        }));
      } catch (error) {
        console.error('Error fetching opportunities:', error);
        return [];
      }
    },
    enabled: !!contactId,
  });
}