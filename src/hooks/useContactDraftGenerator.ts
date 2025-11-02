import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Simplified hook for generating email drafts from the Contacts table
 * Posts contact data to n8n using the same backend endpoint
 */
export function useContactDraftGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateDraft = async (contactId: string) => {
    setIsGenerating(true);

    try {
      // Step 1: Fetch contact data from v_contact_email_composer view
      const { data: contact, error: contactError } = await supabase
        .from('v_contact_email_composer')
        .select('*')
        .eq('contact_id', contactId)
        .single();

      if (contactError || !contact) {
        throw new Error('Contact not found or has insufficient data');
      }

      // Step 2: Load contact-specific settings if they exist
      const { data: contactSettings } = await supabase
        .from('contact_email_builder_settings')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();

      // Step 3: Map v_contact_email_composer data to EnhancedDraftPayload structure
      // Type guard for arrays from Json
      const toArray = (val: any): any[] => Array.isArray(val) ? val : [];
      
      const faDescriptions = toArray(contact.fa_descriptions);
      const opps = toArray(contact.opps);
      const articles = toArray(contact.articles);
      
      const payload = {
        contact: {
          id: contact.contact_id as string,
          fullName: contact.full_name as string,
          firstName: contact.first_name as string,
          email: contact.email as string,
          organization: (contact.organization as string) || '',
          groupContact: null,
          groupEmailRole: null,
          assistantNames: toArray(contact.assistant_names),
        },
        groupMembers: null,
        focusAreas: {
          list: toArray(contact.focus_areas),
          count: (contact.fa_count as number) || 0,
          sectors: toArray(contact.fa_sectors),
          descriptions: faDescriptions.map((d: any) => ({
            focusArea: d.focus_area,
            description: d.description,
            platformType: d.platform_type,
            sector: d.sector,
          })),
          platforms: [],
          addons: [],
        },
        opportunities: {
          top: opps.map((o: any) => ({
            dealName: o.deal_name,
            ebitda: o.ebitda_in_ms,
          })),
          count: opps.length,
        },
        articles: {
          available: articles.map((a: any) => ({
            focusArea: a.focus_area,
            link: a.article_link,
            lastDate: a.last_date_to_use,
          })),
          selected: null,
        },
        routing: {
          masterKey: 'hybrid_neutral',
          tone: 'hybrid',
          subjectStyle: 'mixed',
          deltaType: (contactSettings?.delta_type as string) || (contact.delta_type as string) || 'Email',
          daysSinceContact: contact.most_recent_contact 
            ? Math.floor((Date.now() - new Date(contact.most_recent_contact as string).getTime()) / 86400000)
            : 999,
        },
        content: {
          greeting: '',
          signature: '',
          assistantClause: '',
        },
        cc: {
          leads: toArray(contact.lead_emails),
          assistants: toArray(contact.assistant_emails),
          final: [],
        },
        modules: contactSettings?.module_states || {},
        flow: [],
        moduleSequence: [],
        modulesV2: [],
        qualityCheck: {
          pass: true,
          reason: '',
          checks: {},
        },
        tracking: {
          phraseIds: [],
          inquiryId: null,
        },
      };

      // Step 4: Post to n8n via edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post_to_n8n`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ payload }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to connect to the email generation service';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore parse errors
        }
        throw new Error(errorMessage);
      }

      // Step 5: Success toast
      const contactName = (contact as any).full_name || (contact as any).email || 'Contact';
      toast({
        title: 'Draft Generated',
        description: `Draft for ${contactName} has been sent to Outlook`,
      });

      setIsGenerating(false);
    } catch (error) {
      console.error('Contact draft generation error:', error);
      
      toast({
        title: 'Draft Generation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      
      setIsGenerating(false);
    }
  };

  return {
    generateDraft,
    isGenerating,
  };
}
