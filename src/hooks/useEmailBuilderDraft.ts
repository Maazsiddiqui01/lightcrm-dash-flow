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
    platform_type: string;
    sector: string;
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
    customInstructions: string;
    customInsertion: string;
  };
  articles: Array<{
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
      const response = await fetch('https://inverisllc.app.n8n.cloud/webhook/Email-Builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as EmailBuilderResult;
    },
    onSuccess: () => {
      toast({
        title: "Draft Generated",
        description: "Email draft has been generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate email draft",
        variant: "destructive",
      });
    },
  });
}