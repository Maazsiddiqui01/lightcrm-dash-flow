import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface DraftPayload {
  contact: any;
  template: any;
  variables: any;
  selectedArticle?: any; // Add selected article to payload interface
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
      logger.log('Making request to N8N webhook:', N8N_WEBHOOK_URL, payload);
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      logger.log('N8N webhook response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('N8N webhook error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const raw = await response.json();
      logger.log('N8N Webhook raw response data:', raw);

      // Normalize various possible n8n shapes into a DraftResult
      const coerceToDraft = (obj: any): DraftResult | null => {
        if (!obj) return null;
        // If object already in expected shape
        if (typeof obj === 'object' && (obj.subject || obj.body)) {
          return {
            subject: (obj.subject ?? 'No Subject').toString(),
            body: (obj.body ?? '').toString(),
            cc: Array.isArray(obj.cc) ? obj.cc : [],
            send: obj.send !== false,
            skip_reason: obj.skip_reason,
          } as DraftResult;
        }
        return null;
      };

      // 1) Array envelope: [ { output: { subject, body } } ] or [ { subject, body } ]
      if (Array.isArray(raw) && raw.length > 0) {
        const first = raw[0];
        const fromArray = coerceToDraft(first.output ?? first);
        if (fromArray) {
          logger.log('Parsed N8N array response -> DraftResult:', fromArray);
          return fromArray;
        }
        // If output is a stringified JSON or HTML
        const output = first.output ?? first;
        if (typeof output === 'string') {
          try {
            const parsed = JSON.parse(output);
            const asDraft = coerceToDraft(parsed);
            if (asDraft) return asDraft;
          } catch (e) {
            logger.warn('Array output is string but not JSON, attempting HTML/text parse');
            // fall through to text/HTML parsing below
            const text = output as string;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            const plain = tempDiv.textContent || tempDiv.innerText || text;
            const subjectMatch = plain.match(/Subject:\s*(.+?)(?:\n|$)/i);
            const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
            let body = plain;
            if (subjectMatch) {
              const subjectLineEnd = plain.indexOf(subjectMatch[0]) + subjectMatch[0].length;
              body = plain.substring(subjectLineEnd).replace(/^\n+/, '').trim();
            }
            return { subject, body, cc: [], send: true } as DraftResult;
          }
        }
      }

      // 2) Object envelope with output object or string
      if (raw && typeof raw === 'object') {
        const direct = coerceToDraft(raw);
        if (direct) return direct;

        if (raw.output && typeof raw.output === 'object') {
          const fromOutputObj = coerceToDraft(raw.output);
          if (fromOutputObj) return fromOutputObj;
        }

        if (raw.output && typeof raw.output === 'string') {
          let emailText = raw.output as string;
          if (emailText.includes('<') && emailText.includes('>')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = emailText;
            emailText = tempDiv.textContent || tempDiv.innerText || emailText;
          }
          const subjectMatch = emailText.match(/Subject:\s*(.+?)(?:\n|$)/i);
          const subject = subjectMatch ? subjectMatch[1].trim() : 'No Subject';
          let body = emailText;
          if (subjectMatch) {
            const subjectLineEnd = emailText.indexOf(subjectMatch[0]) + subjectMatch[0].length;
            body = emailText.substring(subjectLineEnd).replace(/^\n+/, '').trim();
          }
          return { subject, body, cc: raw.cc || [], send: raw.send !== false, skip_reason: raw.skip_reason } as DraftResult;
        }
      }

      logger.warn('N8N response did not match known formats, coercing to string');
      return { subject: 'Draft', body: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2), cc: [], send: true } as DraftResult;
    },
    onSuccess: (data) => {
      logger.log('Draft generation successful:', data);
      toast({
        title: "Draft Generated",
        description: "Email draft has been generated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      logger.error('Draft generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate draft",
        variant: "destructive",
      });
    },
  });
}