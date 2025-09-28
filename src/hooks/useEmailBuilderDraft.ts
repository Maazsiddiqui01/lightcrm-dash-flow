import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

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
    platform_type?: string;
  }>;
  opps: string[];
  assistantNames: string[];
  delta_type: string;
  mostRecentContact: string;
  OutreachDate: string;
  template: {
    id: string;
    name: string;
    description: string;
    is_preset: boolean;
    customInstructions?: string;
    customInsertion?: string;
  };
  articles: Array<{
    focus_area: string;
    article_link: string;
  }>;
}

export interface EmailBuilderResult {
  success: boolean;
  message?: string;
  data?: any;
}

const EMAIL_BUILDER_WEBHOOK_URL = 'https://inverisllc.app.n8n.cloud/webhook/Email-Builder';

export function useEmailBuilderDraft() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: EmailBuilderPayload): Promise<EmailBuilderResult> => {
      console.log('Making request to Email Builder webhook:', EMAIL_BUILDER_WEBHOOK_URL, payload);
      
      const response = await fetch(EMAIL_BUILDER_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Email Builder webhook response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Email Builder webhook error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Email Builder webhook response data:', result);

      return {
        success: true,
        data: result,
      };
    },
    onSuccess: (data) => {
      console.log('Email Builder draft generation successful:', data);
      toast({
        title: "Draft Generated",
        description: "Email draft has been generated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error('Email Builder draft generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate draft",
        variant: "destructive",
      });
    },
  });
}