import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactEmailComposer } from '@/types/emailComposer';

// Transform function to convert the raw database response to typed interface
function transformComposerData(data: any): ContactEmailComposer {
  return {
    ...data,
    fa_descriptions: Array.isArray(data.fa_descriptions) ? data.fa_descriptions : [],
    opps: Array.isArray(data.opps) ? data.opps : [],
    articles: Array.isArray(data.articles) ? data.articles : [],
  };
}

/**
 * Search contacts by name or email for the email composer
 */
export function useSearchContacts(term: string) {
  return useQuery({
    queryKey: ['composer-search', term],
    queryFn: async (): Promise<ContactEmailComposer[]> => {
      if (!term || term.length < 2) return [];
      
      const { data, error } = await supabase
        .from('v_contact_email_composer')
        .select('*')
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
        .order('full_name')
        .limit(20);
      
      if (error) throw error;
      return (data || []).map(transformComposerData);
    },
    enabled: !!term && term.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Get composer data for a specific contact by email
 */
export function useComposerRow(email: string) {
  return useQuery({
    queryKey: ['composer-row', email],
    queryFn: async (): Promise<ContactEmailComposer | null> => {
      if (!email) return null;
      
      const { data, error } = await supabase
        .from('v_contact_email_composer')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (error) throw error;
      return data ? transformComposerData(data) : null;
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

/**
 * Get all contacts for the email composer (paginated)
 */
export function useComposerContacts(page = 0, limit = 50) {
  return useQuery({
    queryKey: ['composer-contacts', page, limit],
    queryFn: async (): Promise<ContactEmailComposer[]> => {
      const from = page * limit;
      const to = from + limit - 1;
      
      const { data, error } = await supabase
        .from('v_contact_email_composer')
        .select('*')
        .order('full_name')
        .range(from, to);
      
      if (error) throw error;
      return (data || []).map(transformComposerData);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}