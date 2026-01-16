import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { ContactEmailComposer, FocusAreaDescription, Opportunity, Article } from '@/types/emailComposer';

export function useSearchContacts(term: string) {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ['contact-search', term],
    queryFn: async (): Promise<ContactEmailComposer[]> => {
      if (!term || term.trim().length < 2) {
        return [];
      }

      const { data, error } = await supabase
        .from('v_contact_email_composer')
        .select('*')
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,organization.ilike.%${term}%`)
        .limit(50);

      if (error) {
        logger.error('Search contacts error:', error);
        toast({
          title: "Search Error",
          description: "Failed to search contacts",
          variant: "destructive",
        });
        throw error;
      }

      // Transform the JSON data to proper types
      return (data || []).map(row => ({
        ...row,
        fa_descriptions: (row.fa_descriptions as any) || [] as FocusAreaDescription[],
        opps: (row.opps as any) || [] as Opportunity[],
        articles: (row.articles as any) || [] as Article[],
        email_cc: (row as any).email_cc || null,
        meeting_cc: (row as any).meeting_cc || null,
        delta_type: ((row as any).delta_type as 'Email' | 'Meeting') || null,
        latest_contact_email: (row as any).latest_contact_email || null,
        latest_contact_meeting: (row as any).latest_contact_meeting || null,
      }));
    },
    enabled: !!term && term.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch contact data by email or contact_id
 * @param identifier - email address or contact_id
 * @param isContactId - if true, lookup by contact_id instead of email
 */
export function useComposerRow(identifier: string | null, isContactId = false) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['composer-row', identifier, isContactId],
    queryFn: async (): Promise<ContactEmailComposer | null> => {
      if (!identifier) return null;

      const query = supabase
        .from('v_contact_email_composer')
        .select('*');
      
      // Lookup by contact_id or email based on flag
      if (isContactId) {
        query.eq('contact_id', identifier);
      } else {
        query.eq('email', identifier);
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) {
        logger.error('Get composer row error:', error);
        toast({
          title: "Load Error",
          description: "Failed to load contact details",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) return null;

      // Transform the JSON data to proper types
      return {
        ...data,
        fa_descriptions: (data.fa_descriptions as any) || [] as FocusAreaDescription[],
        opps: (data.opps as any) || [] as Opportunity[],
        articles: (data.articles as any) || [] as Article[],
        email_cc: (data as any).email_cc || null,
        meeting_cc: (data as any).meeting_cc || null,
        delta_type: ((data as any).delta_type as 'Email' | 'Meeting') || null,
        latest_contact_email: (data as any).latest_contact_email || null,
        latest_contact_meeting: (data as any).latest_contact_meeting || null,
      };
    },
    enabled: !!identifier,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}