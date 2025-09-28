import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { DraftPayload } from '@/lib/payload';

export interface DraftBuilderResult {
  subject: string;
  body: string;
  cc?: string;
  send: boolean;
  skip_reason?: string;
}

const N8N_EMAIL_BUILDER_URL = 'https://inverisllc.app.n8n.cloud/webhook/Email-Builder';

export function useDraftBuilder() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: DraftPayload): Promise<DraftBuilderResult> => {
      console.log('Sending payload to n8n Email-Builder webhook:', payload);
      
      const response = await fetch(N8N_EMAIL_BUILDER_URL, {
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
      console.log('Received response from n8n Email-Builder webhook:', data);
      
      return data as DraftBuilderResult;
    },
    onSuccess: (result) => {
      toast({
        title: "Draft Generated Successfully",
        description: `Email draft created${result.send ? ' and ready to send' : ''}`,
      });
    },
    onError: (error: any) => {
      console.error('Draft generation error:', error);
      toast({
        title: "Draft Generation Failed",
        description: error.message || "Failed to generate email draft",
        variant: "destructive",
      });
    },
  });
}