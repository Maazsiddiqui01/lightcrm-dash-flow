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
      
      // Parse the N8N response format (HTML or text)
      if (result.output && typeof result.output === 'string') {
        let emailText = result.output;
        
        // If response contains HTML, extract text content
        if (emailText.includes('<') && emailText.includes('>')) {
          // Create a temporary div to parse HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = emailText;
          emailText = tempDiv.textContent || tempDiv.innerText || emailText;
        }
        
        // Extract subject and body from the text
        const subjectMatch = emailText.match(/Subject:\s*(.+?)(?:\n|$)/i);
        const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
        
        // Remove subject line and extract body
        let body = emailText;
        if (subjectMatch) {
          const subjectLineEnd = emailText.indexOf(subjectMatch[0]) + subjectMatch[0].length;
          body = emailText.substring(subjectLineEnd).replace(/^\n+/, '').trim();
        }
        
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