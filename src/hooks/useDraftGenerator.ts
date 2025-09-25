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
      console.log('Making request to N8N webhook:', N8N_WEBHOOK_URL, payload);
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('N8N webhook response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('N8N webhook error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('N8N Webhook response data:', result);
      
      // Parse the N8N response format
      if (result.output && typeof result.output === 'string') {
        // Extract subject and body from the output string
        const emailText = result.output;
        const subjectMatch = emailText.match(/Subject:\s*(.+?)(?:\n|$)/);
        const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
        
        // Remove subject line and extract body
        const bodyStart = emailText.indexOf('\n\n');
        const body = bodyStart > -1 ? emailText.substring(bodyStart + 2).trim() : emailText;
        
        return {
          subject,
          body,
          cc: result.cc || [],
          send: result.send !== false, // Default to true unless explicitly false
          skip_reason: result.skip_reason
        } as DraftResult;
      }
      
      // Fallback to original format
      return result as DraftResult;
    },
    onSuccess: (data) => {
      console.log('Draft generation successful:', data);
      toast({
        title: "Draft Generated",
        description: "Email draft has been generated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error('Draft generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate draft",
        variant: "destructive",
      });
    },
  });
}