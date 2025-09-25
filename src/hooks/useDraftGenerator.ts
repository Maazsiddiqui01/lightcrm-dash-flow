import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface DraftPayload {
  contact: any;
  template: any;
  variables: any;
}

export interface DraftResult {
  subject: string;
  body: string;
  cc?: string[];
  send: boolean;
  skip_reason?: string;
}

const N8N_WEBHOOK_URL = 'https://inverisllc.app.n8n.cloud/webhook/Draft-Email';

export function useDraftGenerator() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: DraftPayload): Promise<DraftResult> => {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result as DraftResult;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate draft",
        variant: "destructive",
      });
    },
  });
}