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

      // Step 3: Build payload with contact data and optional settings
      const payload = {
        contact_id: contactId,
        ...contact,
        // Include settings if they exist
        ...(contactSettings && {
          module_states: contactSettings.module_states,
          delta_type: contactSettings.delta_type,
          module_selections: contactSettings.module_selections,
          curated_recipients: contactSettings.curated_recipients,
        }),
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
