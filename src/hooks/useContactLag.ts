import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useContactLag(contactId: string | null) {
  return useQuery({
    queryKey: ['contact_lag', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      try {
        // Try to calculate lag days directly from contact data
        const { data: contact, error } = await supabase
          .from('contacts_raw')
          .select('most_recent_contact, delta')
          .eq('id', contactId)
          .maybeSingle();
        
        if (error) throw error;
        if (!contact) return null;
        
        // Calculate lag days if we have the data
        if (contact.most_recent_contact && contact.delta) {
          const lastContact = new Date(contact.most_recent_contact);
          const now = new Date();
          const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
          return {
            contact_id: contactId,
            lag_days: Math.max(0, contact.delta - daysSince)
          };
        }
        
        return { contact_id: contactId, lag_days: contact.delta || 0 };
      } catch (error) {
        console.error('Error calculating lag:', error);
        return null;
      }
    },
    enabled: !!contactId,
  });
}