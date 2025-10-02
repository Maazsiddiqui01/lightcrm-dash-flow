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
    setProgress(0);
    setStreamedContent('');

    try {
      const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate_email_draft`;

      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate draft';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Use default error message
        }

        if (response.status === 429) {
          toast({
            title: 'Rate Limit Exceeded',
            description: 'Too many requests. Please wait a moment and try again.',
            variant: 'destructive',
          });
        } else if (response.status === 402) {
          toast({
            title: 'AI Credits Exhausted',
            description: 'Please add credits to your Lovable workspace to continue.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Generation Failed',
            description: errorMessage,
            variant: 'destructive',
          });
        }

        setIsGenerating(false);
        return null;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullBody = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line-by-line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            
            if (content) {
              fullBody += content;
              setStreamedContent(fullBody);
              
              // Update progress (approximate based on expected length)
              const estimatedLength = 800; // Average email body length
              setProgress(Math.min(95, (fullBody.length / estimatedLength) * 100));
            }
          } catch (e) {
            // Incomplete JSON - put it back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':')) continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullBody += content;
              setStreamedContent(fullBody);
            }
          } catch {
            // Ignore partial leftovers
          }
        }
      }

      setProgress(100);

      // Log rotation tracking
      await logPayloadUsage(payload.contact.id, payload.tracking);

      // Build final result
      const result: DraftGenerationResult = {
        body: fullBody.trim(),
        subject: payload.content.subject,
        greeting: payload.content.greeting || `Hi ${payload.contact.firstName}`,
        signature: payload.content.signature,
        ccList: payload.cc.final,
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
