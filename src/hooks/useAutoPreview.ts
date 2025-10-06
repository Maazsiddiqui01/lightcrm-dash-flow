import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import type { Article } from '@/types/emailComposer';
import { buildModuleConfiguration } from '@/lib/draftGeneration';
import { useGlobalPhrases } from './usePhraseLibrary';
import { useGlobalInquiries } from './useInquiryLibrary';
import { useSubjectLibrary, pickSubject } from './useSubjectLibrary';
import { useMasterTemplates } from './useMasterTemplates';
import { logger } from '@/lib/logger';

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
  
  // Load libraries
  const { data: masterTemplates } = useMasterTemplates();
  const { data: globalPhrases = [] } = useGlobalPhrases();
  const { data: globalInquiries = [] } = useGlobalInquiries();
  const subjectStyle = (masterTemplate?.subject_style === 'formal' || masterTemplate?.subject_style === 'casual') 
    ? masterTemplate.subject_style 
    : 'hybrid';
  const { data: subjectLibrary = [] } = useSubjectLibrary(subjectStyle);

  // Debounce the inputs to avoid too many requests
  const debouncedModuleStates = useDebounce(moduleStates, 1000);
  const debouncedDeltaType = useDebounce(deltaType, 500);

  useEffect(() => {
    let cancelled = false;

    const generatePreview = async () => {
      logger.log('🔍 Preview generation starting:', { 
        hasContactData: !!contactData, 
        hasMasterTemplate: !!masterTemplate,
        contactEmail: contactData?.email,
        contactFirstName: contactData?.first_name,
        focusAreas: contactData?.focus_areas
      });

      if (!contactData || !masterTemplate) {
        logger.log('❌ Missing contactData or masterTemplate');
        setPreviewData(null);
        return;
      }

      // Check if we have the minimum required data
      if (!contactData.email || !contactData.first_name) {
        logger.log('❌ Missing contact email or first_name');
        setPreviewData(null);
        return;
      }

      setIsGenerating(true);

      try {
        // Get master template defaults
        const masterDefaults = masterTemplates?.find(mt => mt.master_key === masterTemplate.master_key);
        if (!masterDefaults) {
          logger.log('❌ Master defaults not found');
          setIsGenerating(false);
          return;
        }

        logger.log('✅ Building module configuration...');
        
        // Calculate days since most recent contact
        const daysSinceContact = contactData.most_recent_contact 
          ? Math.floor((Date.now() - new Date(contactData.most_recent_contact).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        // Build module configuration with actual library selections
        const moduleConfig = await buildModuleConfiguration({
          contact: contactData,
          masterTemplate: masterDefaults,
          allPhrases: globalPhrases,
          allInquiries: globalInquiries,
          selectedArticle: selectedArticle?.article_link || null,
          daysSinceContact,
        });

        // Select subject from library with token replacement
        const selectedSubject = await pickSubject({
          tone: subjectStyle,
          org: contactData.organization || '',
          focusAreas: contactData.focus_areas || [],
          sector: contactData.fa_descriptions?.[0]?.sector,
          subjects: subjectLibrary,
        });

        logger.log('✅ Selected subject:', selectedSubject);

        // Build body preview using selected phrases
        const bodyParts: string[] = [];

        // Greeting
        if (moduleConfig.phrases.greeting) {
          let greeting = moduleConfig.phrases.greeting.phrase_text;
          greeting = greeting.replace('[First Name]', contactData.first_name || 'there');
          bodyParts.push(greeting);
        }

        // Self personalization / AI backup
        if (moduleConfig.phrases.self_personalization) {
          bodyParts.push('\n' + moduleConfig.phrases.self_personalization.phrase_text);
        } else if (moduleConfig.phrases.ai_backup) {
          bodyParts.push('\n' + moduleConfig.phrases.ai_backup.phrase_text);
        }

        // Top opportunities
        if (moduleConfig.modules.top_opportunities && contactData.opps && contactData.opps.length > 0) {
          const oppsList = contactData.opps.slice(0, 3).map((o: any) => o.deal_name).join(', ');
          bodyParts.push(`\nI wanted to touch base regarding ${oppsList}.`);
        }

        // Article recommendations
        if (moduleConfig.modules.article_recommendations && selectedArticle) {
          if (moduleConfig.phrases.article_recommendations) {
            let articlePhrase = moduleConfig.phrases.article_recommendations.phrase_text;
            articlePhrase = articlePhrase.replace('[Link]', selectedArticle.article_link);
            bodyParts.push('\n' + articlePhrase);
          }
        }

        // Inquiry
        if (moduleConfig.inquiry) {
          let inquiryText = moduleConfig.inquiry.inquiry_text;
          // Replace tokens
          inquiryText = inquiryText.replace(/\[Focus Area\]/g, contactData.focus_areas?.[0] || 'your area');
          inquiryText = inquiryText.replace(/\[Topic\]/g, contactData.focus_areas?.[0] || 'this topic');
          if (contactData.opps?.[0]) {
            inquiryText = inquiryText.replace(/\[Opp X\]/g, contactData.opps[0].deal_name);
          }
          bodyParts.push('\n' + inquiryText);
        }

        // Meeting request
        if (moduleConfig.modules.meeting_request && moduleConfig.phrases.meeting_request) {
          bodyParts.push('\n' + moduleConfig.phrases.meeting_request.phrase_text);
        }

        // Assistant clause
        if (moduleConfig.assistantClause) {
          bodyParts.push('\n' + moduleConfig.assistantClause);
        }

        // Closing
        if (moduleConfig.signature) {
          bodyParts.push('\n' + moduleConfig.signature);
        }

        const preview: PreviewData = {
          subject: selectedSubject || `Re: ${contactData.focus_areas?.[0] || 'Update'}`,
          inquiry: moduleConfig.inquiry 
            ? {
                text: moduleConfig.inquiry.inquiry_text,
                category: moduleConfig.inquiry.category,
              }
            : undefined,
          assistantClause: moduleConfig.assistantClause,
          bodyPreview: bodyParts.join('\n'),
        };

        logger.log('✅ Preview generated:', preview);

        if (!cancelled) {
          setPreviewData(preview);
        }
      } catch (error) {
        logger.error('❌ Preview generation error:', error);
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
  }, [
    contactData?.email, 
    debouncedModuleStates, 
    debouncedDeltaType, 
    selectedArticle?.article_link, 
    masterTemplate?.master_key,
    globalPhrases.length,
    globalInquiries.length,
    subjectLibrary.length,
    masterTemplates
  ]);

  return {
    previewData,
    isGenerating,
  };
}
