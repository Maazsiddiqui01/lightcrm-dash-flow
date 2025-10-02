import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { EnhancedDraftPayload } from '@/lib/enhancedPayload';
import { logPayloadUsage } from '@/lib/enhancedPayload';

interface DraftGenerationResult {
  body: string;
  subject: string;
  greeting: string;
  signature: string;
  ccList: string[];
}

/**
 * Hook for generating email drafts with the enhanced payload system
 */
export function useEnhancedDraftGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [streamedContent, setStreamedContent] = useState('');
  const { toast } = useToast();

  const generateDraft = async (
    payload: EnhancedDraftPayload
  ): Promise<DraftGenerationResult | null> => {
    // Check quality control first
    if (!payload.qualityCheck.pass) {
      toast({
        title: 'Draft Generation Blocked',
        description: payload.qualityCheck.reason || 'Quality control check failed',
        variant: 'destructive',
      });
      return null;
    }

    setIsGenerating(true);
    setProgress(50); // Show progress for n8n call
    setStreamedContent('');

    try {
      // POST to n8n via edge function
      const FUNCTION_URL = `https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/post_to_n8n`;

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ2hkcWt4d3V5cHR4emRpZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjA0NDEsImV4cCI6MjA3MTYzNjQ0MX0._zZEVM4XENutH8AxM_4Sh_DSGDGbFOTy6kC5-UGLFIs`,
        },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate draft via n8n';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Use default error message
        }

        toast({
          title: 'Generation Failed',
          description: errorMessage,
          variant: 'destructive',
        });

        setIsGenerating(false);
        return null;
      }

      setProgress(75);

      // n8n returns: { subject, body, cc?, send, skip_reason? }
      const n8nResult = await response.json();
      console.log('n8n response:', n8nResult);

      setProgress(100);

      // Log rotation tracking
      await logPayloadUsage(payload.contact.id, payload.tracking);

      // Parse CC list from n8n response - should include names
      let ccList: string[] = [];
      if (n8nResult.cc) {
        if (typeof n8nResult.cc === 'string') {
          ccList = n8nResult.cc.split(/[;,]/).map((e: string) => e.trim()).filter(Boolean);
        } else if (Array.isArray(n8nResult.cc)) {
          ccList = n8nResult.cc;
        }
      } else {
        ccList = payload.cc.final;
      }

      // Build final result from n8n response with proper formatting
      const result: DraftGenerationResult = {
        body: n8nResult.body || n8nResult.emailBody || '',
        subject: n8nResult.subject || payload.content.subject,
        greeting: n8nResult.greeting || payload.content.greeting || `Hi ${payload.contact.firstName}`,
        signature: n8nResult.signature || payload.content.signature,
        ccList,
      };

      toast({
        title: 'Draft Generated',
        description: 'Email draft has been generated successfully',
      });

      setIsGenerating(false);
      return result;
    } catch (error) {
      console.error('Draft generation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate draft',
        variant: 'destructive',
      });
      setIsGenerating(false);
      return null;
    }
  };

  return {
    generateDraft,
    isGenerating,
    progress,
    streamedContent,
  };
}
