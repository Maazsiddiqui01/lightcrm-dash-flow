import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface EmailBuilderPayload {
  contact: {
    firstName: string;
    fullName: string;
    email: string;
    organization: string;
    lgEmailsCc: string;
  };
  focusAreas: string[];
  focusAreaDescriptions: Array<{
    focus_area: string;
    description: string;
    sector: string;
    platform_type?: 'New Platform' | 'Add-On';
  }>;
  opps: string[];
  assistantNames: string[];
  delta_type: 'Email' | 'Meeting';
  mostRecentContact: string;
  OutreachDate: string;
  template: {
    id: string;
    name: string;
    description?: string;
    is_preset: boolean;
    customInstructions?: string;
    customInsertion?: 'before_closing' | 'after_open' | 'after_fa';
  };
  articles?: Array<{
    focus_area: string;
    article_link: string;
  }>;
}

export interface EmailBuilderResult {
  subject: string;
  body: string;
  cc?: string;
  send: boolean;
  skip_reason?: string;
}

export function useEmailBuilderDraft() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: EmailBuilderPayload): Promise<EmailBuilderResult> => {
      logger.log('Sending payload to n8n:', payload);
      
      const response = await fetch('https://inverisllc.app.n8n.cloud/webhook/Email-Builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data as EmailBuilderResult;
    },
    onSuccess: (result) => {
      toast({
        title: "Draft Generated Successfully",
        description: `Email draft created${result.send ? ' and ready to send' : ''}`,
      });
    },
    onError: (error: any) => {
      logger.error('Draft generation error:', error);
      toast({
        title: "Draft Generation Failed",
        description: error.message || "Failed to generate email draft",
        variant: "destructive",
      });
    },
  });
}