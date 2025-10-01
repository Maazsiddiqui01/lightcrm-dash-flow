import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';
import { useDraftGenerator } from './useDraftGenerator';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import type { Article } from '@/types/emailComposer';

interface PreviewData {
  subject: string;
  inquiry?: { text: string; category: string };
  assistantClause?: string;
  bodyPreview: string;
}

export function useAutoPreview(
  contactData: any,
  deltaType: 'Email' | 'Meeting',
  moduleStates: ModuleStates,
  selectedArticle: Article | null,
  masterTemplate: any
) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { mutateAsync: generateDraft } = useDraftGenerator();

  // Debounce the inputs to avoid too many requests
  const debouncedModuleStates = useDebounce(moduleStates, 1000);
  const debouncedDeltaType = useDebounce(deltaType, 500);

  useEffect(() => {
    let cancelled = false;

    const generatePreview = async () => {
      if (!contactData || !masterTemplate) {
        setPreviewData(null);
        return;
      }

      setIsGenerating(true);

      try {
        // This would call the draft generation logic
        // For now, we'll create a simple preview
        const preview: PreviewData = {
          subject: `Quick preview for ${contactData.contact?.firstName || 'contact'}`,
          inquiry: {
            text: "Preview inquiry text would appear here",
            category: "opportunity"
          },
          assistantClause: deltaType === 'Meeting' ? "We'll coordinate with your assistant for scheduling" : undefined,
          bodyPreview: `Hi ${contactData.contact?.firstName || 'there'},\n\nThis is a live preview of your email draft. The actual content will be generated based on your module selections and contact data.\n\nBest regards`
        };

        if (!cancelled) {
          setPreviewData(preview);
        }
      } catch (error) {
        console.error('Preview generation error:', error);
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    };

    generatePreview();

    return () => {
      cancelled = true;
    };
  }, [contactData?.contact?.email, debouncedModuleStates, debouncedDeltaType, selectedArticle, masterTemplate]);

  return {
    previewData,
    isGenerating,
  };
}
