import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { callN8nProxy } from '@/lib/n8nProxy';

export interface DraftPayload {
  contact: any;
  template: any;
  variables: any;
  selectedArticle?: any;
}

export interface DraftResult {
  subject: string;
  body: string;
  cc?: string[];
  send: boolean;
  skip_reason?: string;
}

export function useDraftGenerator() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: DraftPayload): Promise<DraftResult> => {
      logger.log('Making request to n8n via proxy:', payload);
      
      const raw = await callN8nProxy<any>('draft-email', payload as unknown as Record<string, unknown>);

      logger.log('n8n proxy response data:', raw);

      // Normalize various possible n8n shapes into a DraftResult
      const coerceToDraft = (obj: any): DraftResult | null => {
        if (!obj) return null;
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

      if (Array.isArray(raw) && raw.length > 0) {
        const first = raw[0];
        const fromArray = coerceToDraft(first.output ?? first);
        if (fromArray) {
          logger.log('Parsed array response -> DraftResult:', fromArray);
          return fromArray;
        }
        const output = first.output ?? first;
        if (typeof output === 'string') {
          try {
            const parsed = JSON.parse(output);
            const asDraft = coerceToDraft(parsed);
            if (asDraft) return asDraft;
          } catch (e) {
            logger.warn('Array output is string but not JSON');
          }
        }
      }

      const direct = coerceToDraft(raw);
      if (direct) return direct;

      logger.warn('Unexpected response shape, using defaults');
      return {
        subject: 'No Subject',
        body: typeof raw === 'string' ? raw : JSON.stringify(raw),
        send: false,
        skip_reason: 'Unexpected response format',
      };
    },
    onSuccess: (result) => {
      const title = result.send ? 'Draft Ready' : 'Draft Generated';
      toast({ title, description: `Subject: ${result.subject}` });
    },
    onError: (error: any) => {
      logger.error('Draft generation error:', error);
      toast({
        title: 'Draft Generation Failed',
        description: error.message || 'Failed to generate email draft',
        variant: 'destructive',
      });
    },
  });
}
