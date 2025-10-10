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
        throw new Error('Authentication required. Please log in again to continue.');
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
        let errorMessage = 'Failed to connect to the email generation service';
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          
          // Provide specific guidance based on error type
          if (response.status === 401 || response.status === 403) {
            errorDetails = 'Your session may have expired. Please refresh the page and try again.';
          } else if (response.status >= 500) {
            errorDetails = 'The service is temporarily unavailable. Please try again in a few moments.';
          } else if (response.status === 429) {
            errorDetails = 'Too many requests. Please wait a moment before trying again.';
          }
        } catch {
          errorDetails = 'Unable to connect to the generation service. Please check your internet connection and try again.';
        }

        toast({
          title: 'Generation Failed',
          description: errorDetails || errorMessage,
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
      // FIX ISSUE #3: Throw proper error instead of silent failure
      let n8nResult;
      try {
        // Handle array response format [{ output: {...} }]
        const parsed = JSON.parse(accumulated);
        n8nResult = Array.isArray(parsed) && parsed.length > 0 ? parsed[0].output : parsed;
        
        // Validate response has required fields
        if (!n8nResult || typeof n8nResult !== 'object') {
          throw new Error('Invalid response format: expected object');
        }
        
        if (!n8nResult.subject && !n8nResult.body) {
          throw new Error('Response missing required fields (subject and body)');
        }
      } catch (e) {
        console.error('Failed to parse n8n response:', e);
        console.error('Raw response:', accumulated);
        
        // Provide actionable error message
        const errorMsg = e instanceof Error ? e.message : 'Unknown parsing error';
        throw new Error(`Draft generation failed: ${errorMsg}. The service returned an invalid response format.`);
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
      
      let errorTitle = 'Draft Generation Failed';
      let errorDescription = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        errorDescription = error.message;
        
        // Provide helpful context for common errors
        if (error.message.includes('Authentication')) {
          errorTitle = 'Authentication Error';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorDescription = 'Network connection issue. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorDescription = 'Request timed out. The service may be busy. Please try again.';
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
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
