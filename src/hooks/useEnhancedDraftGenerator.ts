import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { EnhancedDraftPayload } from '@/lib/enhancedPayload';
import { logPayloadUsage } from '@/lib/enhancedPayload';
import { buildEmailBody, formatCompleteEmail } from '@/lib/bodyBuilder';

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
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // POST to n8n via edge function with streaming support
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post_to_n8n`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ payload }),
        }
      );

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

      setProgress(60);

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setStreamedContent(accumulated);
          setProgress(prev => Math.min(prev + 5, 95));
        }
      }

      setProgress(100);

      // Parse the final accumulated result
      let n8nResult;
      try {
        // Handle array response format [{ output: {...} }]
        const parsed = JSON.parse(accumulated);
        n8nResult = Array.isArray(parsed) && parsed.length > 0 ? parsed[0].output : parsed;
      } catch (e) {
        console.error('Failed to parse n8n response:', e);
        n8nResult = {};
      }
      
      console.log('n8n response:', n8nResult);

      setProgress(100);

      // Log rotation tracking
      await logPayloadUsage(payload.contact.id, payload.tracking);

      // Parse CC list from n8n response
      let ccList: string[] = [];
      if (n8nResult.cc) {
        if (typeof n8nResult.cc === 'string') {
          ccList = n8nResult.cc.split(/[;,]/).map((e: string) => e.trim()).filter(Boolean);
        } else if (Array.isArray(n8nResult.cc)) {
          ccList = n8nResult.cc;
        }
      }

      // Extract greeting and signature from body
      const bodyLines = (n8nResult.body || '').split('\n');
      const greeting = bodyLines[0] || `Hi ${payload.contact.firstName}`;
      const signature = bodyLines[bodyLines.length - 1] || payload.content.signature;
      const bodyWithoutGreetingAndSignature = bodyLines.slice(1, -1).join('\n').trim();

      // Build final result directly from n8n
      const result: DraftGenerationResult = {
        body: bodyWithoutGreetingAndSignature,
        subject: n8nResult.subject || '',
        greeting: greeting,
        signature: signature,
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
