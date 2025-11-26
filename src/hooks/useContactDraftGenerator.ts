import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalPhrases } from './usePhraseLibrary';
import { useGlobalInquiries } from './useInquiryLibrary';
import { useSubjectLibrary } from './useSubjectLibrary';
import { useMasterTemplates } from './useMasterTemplates';
import { buildEnhancedDraftPayload } from '@/lib/enhancedPayload';
import { routeMaster } from '@/lib/router';
import type { ContactEmailComposer } from '@/types/emailComposer';
import type { MasterTemplateDefaults, PhraseLibraryItem } from '@/types/phraseLibrary';
import type { ModuleSelections } from '@/types/moduleSelections';
import type { TeamMember } from '@/components/email-builder/EditableTeam';
import { DEFAULT_MODULE_ORDER } from '@/config/moduleDefaults';
import { MODULE_LIBRARY_MAP, SINGLE_SELECT_MODULES, MULTI_SELECT_MODULES } from '@/config/moduleCategoryMap';
import { pickRandomPhrase, generateSeed } from '@/lib/randomization';

/**
 * Enhanced hook for generating email drafts from the Contacts table
 * Uses full Email Builder logic with phrase auto-selection, inquiries, and quality control
 */
export function useContactDraftGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Load all required libraries
  const { data: allPhrases = [], isLoading: phrasesLoading } = useGlobalPhrases();
  const { data: allInquiries = [], isLoading: inquiriesLoading } = useGlobalInquiries();
  const { data: allSubjects = [], isLoading: subjectsLoading } = useSubjectLibrary();
  const { data: masterTemplates = [], isLoading: templatesLoading } = useMasterTemplates();

  const isLibrariesLoading = phrasesLoading || inquiriesLoading || subjectsLoading || templatesLoading;

  const generateDraft = async (contactId: string) => {
    if (isLibrariesLoading) {
      toast({
        title: 'Please wait',
        description: 'Loading phrase libraries...',
        variant: 'default',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Step 1: Fetch contact data from v_contact_email_composer view
      const { data: contact, error: contactError } = await supabase
        .from('v_contact_email_composer')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();

      if (contactError || !contact) {
        throw new Error('Contact not found or has insufficient data');
      }

      // Step 2: Load contact-specific settings
      const { data: contactSettings } = await supabase
        .from('contact_email_builder_settings')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();

      // Step 3: Load global template defaults (fallback if no contact settings)
      const { data: templateDefaults } = await supabase
        .from('email_template_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      // Step 4: Calculate days since contact
      const daysSinceContact = contact.most_recent_contact 
        ? Math.floor((Date.now() - new Date(contact.most_recent_contact as string).getTime()) / 86400000)
        : 999;

      // Step 5: Determine master template
      // Use routing logic to determine master template based on contact data
      let masterTemplate: MasterTemplateDefaults | undefined;

      if (!masterTemplate) {
        // Use routing logic to determine master template
        const routedMaster = routeMaster(contact.most_recent_contact as string | null);
        masterTemplate = masterTemplates.find(t => t.master_key === routedMaster.master_key);
      }

      if (!masterTemplate) {
        // Fallback to hybrid_neutral
        masterTemplate = masterTemplates.find(t => t.master_key === 'hybrid_neutral');
      }

      if (!masterTemplate) {
        throw new Error('No master template found. Please configure templates first.');
      }

      // Step 6: Auto-populate team members from focus areas
      const teamMembers: TeamMember[] = [];
      const ccEmails: string[] = [];

      const focusAreas = Array.isArray(contact.focus_areas) ? contact.focus_areas : [];
      
      for (const focusArea of focusAreas) {
        const { data: teamData } = await supabase
          .from('lg_focus_area_directory')
          .select('lead1_name, lead1_email, lead2_name, lead2_email, assistant_name, assistant_email')
          .eq('focus_area', focusArea)
          .maybeSingle();
        
        if (teamData) {
          // Add lead 1
          if (teamData.lead1_email && teamData.lead1_name) {
            const existingLead1 = teamMembers.find(m => m.email === teamData.lead1_email);
            if (!existingLead1) {
              teamMembers.push({
                id: `lead1_${focusArea}`,
                name: teamData.lead1_name,
                email: teamData.lead1_email,
                role: 'lead',
              });
              ccEmails.push(teamData.lead1_email);
            }
          }
          
          // Add lead 2
          if (teamData.lead2_email && teamData.lead2_name) {
            const existingLead2 = teamMembers.find(m => m.email === teamData.lead2_email);
            if (!existingLead2) {
              teamMembers.push({
                id: `lead2_${focusArea}`,
                name: teamData.lead2_name,
                email: teamData.lead2_email,
                role: 'lead',
              });
              ccEmails.push(teamData.lead2_email);
            }
          }
          
          // Add assistant
          if (teamData.assistant_email && teamData.assistant_name) {
            const existingAssistant = teamMembers.find(m => m.email === teamData.assistant_email);
            if (!existingAssistant) {
              teamMembers.push({
                id: `assistant_${focusArea}`,
                name: teamData.assistant_name,
                email: teamData.assistant_email,
                role: 'assistant',
              });
              ccEmails.push(teamData.assistant_email);
            }
          }
        }
      }

      // Step 7: Get effective settings
      // Parse Json fields properly
      const contactModuleStates = contactSettings?.module_states ? (typeof contactSettings.module_states === 'object' ? contactSettings.module_states : {}) : null;
      const templateModuleStates = templateDefaults?.module_states ? (typeof templateDefaults.module_states === 'object' ? templateDefaults.module_states : {}) : null;
      
      const contactModuleOrder = contactSettings?.module_order ? (Array.isArray(contactSettings.module_order) ? contactSettings.module_order as string[] : null) : null;
      const templateModuleOrder = templateDefaults?.module_order ? (Array.isArray(templateDefaults.module_order) ? templateDefaults.module_order as string[] : null) : null;
      
      const contactCuratedRecipients = contactSettings?.curated_recipients ? (typeof contactSettings.curated_recipients === 'object' ? contactSettings.curated_recipients as any : null) : null;
      const contactModuleSelections = contactSettings?.module_selections && typeof contactSettings.module_selections === 'object'
        ? (contactSettings.module_selections as Record<string, any>) as ModuleSelections
        : {} as ModuleSelections;
      
      // CRITICAL FIX: Tone, length, and subject pool are ONLY in template settings, NOT contact settings
      const effectiveToneOverride = templateDefaults?.tone_override as 'casual' | 'hybrid' | 'formal' | undefined;
      const effectiveLengthOverride = templateDefaults?.length_override as 'brief' | 'standard' | 'detailed' | undefined;
      
      // Extract subject pool override from template settings
      const templateSubjectPool = templateDefaults?.subject_pool_override 
        ? (Array.isArray(templateDefaults.subject_pool_override) 
            ? templateDefaults.subject_pool_override as any[] 
            : []) 
        : [];
      const effectiveSubjectPoolOverride = templateSubjectPool.map((item: any) => 
        typeof item === 'string' ? item : item?.id || ''
      ).filter(Boolean);
      
      const effectiveModuleOrder = contactModuleOrder || templateModuleOrder || DEFAULT_MODULE_ORDER;
      const effectiveModuleStates = contactModuleStates || templateModuleStates || {};
      const effectiveDeltaType = contactSettings?.delta_type || contact.delta_type || 'Email';
      
      // Recipients from curated_recipients Json field
      const effectiveCuratedTo = contactCuratedRecipients?.to || contact.email as string;
      const effectiveCuratedCc = contactCuratedRecipients?.cc || ccEmails;

      // Step 7.5: Auto-select phrases for modules if no saved selections
      const effectiveModuleSelections: ModuleSelections = { ...contactModuleSelections };
      
      // Implement auto-selection logic with randomization
      if (Object.keys(contactModuleSelections).length === 0) {
        console.log('🎯 Auto-selecting random phrases for contact with no saved selections...');
        
        // Generate seed for this contact
        const seed = generateSeed(contactId);
        
        // Auto-select for single-select modules
        let moduleIndex = 0;
        SINGLE_SELECT_MODULES.forEach((moduleKey) => {
          const category = MODULE_LIBRARY_MAP[moduleKey];
          if (!category) return;

          // Special handling for subject_line
          if (moduleKey === 'subject_line') {
            const subjectPhrases = allPhrases.filter(p => p.category === 'subject');
            const filteredSubjects = effectiveToneOverride
              ? subjectPhrases.filter(p => (p as any).style === effectiveToneOverride || (p as any).style === 'hybrid')
              : subjectPhrases;

            if (filteredSubjects.length > 0) {
              const randomSubject = pickRandomPhrase(filteredSubjects, seed + moduleIndex);
              if (randomSubject) {
                effectiveModuleSelections.subject_line = {
                  type: 'phrase',
                  category: 'subject',
                  phraseId: randomSubject.id,
                  phraseText: randomSubject.phrase_text,
                };
                console.log(`✅ Auto-selected random subject (tone: ${effectiveToneOverride}):`, randomSubject.phrase_text.substring(0, 50));
              }
            }
            moduleIndex++;
            return;
          }

          // Get phrases for this category
          const categoryPhrases = allPhrases.filter(p => p.category === category);
          if (categoryPhrases.length === 0) return;

          // Filter by tri-state (respecting global tri_state from phrase_library)
          const availablePhrases = categoryPhrases.filter(phrase => phrase.tri_state !== 'never');

          const phrasesToUse = availablePhrases.length > 0 ? availablePhrases : categoryPhrases;
          const randomPhrase = pickRandomPhrase(phrasesToUse, seed + moduleIndex);
          
          if (randomPhrase) {
            effectiveModuleSelections[moduleKey] = {
              type: 'phrase',
              category,
              phraseId: randomPhrase.id,
              phraseText: randomPhrase.phrase_text,
            };
            console.log(`✅ Auto-selected random phrase for ${moduleKey}:`, randomPhrase.phrase_text.substring(0, 50));
          }
          moduleIndex++;
        });

        // Auto-select for multi-select modules (select random phrases)
        MULTI_SELECT_MODULES.forEach((moduleKey) => {
          const category = MODULE_LIBRARY_MAP[moduleKey];
          if (!category) return;

          const categoryPhrases = allPhrases.filter(p => p.category === category);
          if (categoryPhrases.length === 0) return;

          const availablePhrases = categoryPhrases.filter(phrase => phrase.tri_state !== 'never');

          const phrasesToUse = availablePhrases.length > 0 ? availablePhrases : categoryPhrases;
          
          effectiveModuleSelections[moduleKey] = {
            type: 'phrase',
            category,
            phraseIds: phrasesToUse.map(p => p.id),
          };
          console.log(`✅ Auto-selected ${phrasesToUse.length} phrases for ${moduleKey}`);
        });
      } else {
        console.log('✅ Using saved module selections from contact settings');
      }

      // Step 8: Map contact to ContactEmailComposer type
      // Helper to safely convert Json to string array
      const toStringArray = (val: any): string[] => {
        if (Array.isArray(val)) {
          return val.filter(v => typeof v === 'string');
        }
        return [];
      };
      
      // Helper to safely convert Json arrays
      const toArray = (val: any): any[] => Array.isArray(val) ? val : [];
      
      const contactForPayload: ContactEmailComposer = {
        contact_id: contact.contact_id as string,
        full_name: contact.full_name as string,
        first_name: contact.first_name as string,
        email: contact.email as string,
        organization: contact.organization as string | null,
        focus_areas: toStringArray(contact.focus_areas),
        fa_count: (contact.fa_count as number) || 0,
        fa_sectors: toStringArray(contact.fa_sectors),
        fa_descriptions: toArray(contact.fa_descriptions) as any,
        gb_present: contact.gb_present as boolean,
        hs_present: contact.hs_present as boolean,
        ls_present: contact.ls_present as boolean,
        has_opps: contact.has_opps as boolean,
        opps: toArray(contact.opps) as any,
        articles: toArray(contact.articles) as any,
        lead_emails: toStringArray(contact.lead_emails),
        assistant_names: toStringArray(contact.assistant_names),
        assistant_emails: toStringArray(contact.assistant_emails),
        most_recent_contact: contact.most_recent_contact as string | null,
        latest_contact_email: contact.most_recent_contact as string | null, // v_contact_email_composer doesn't have latest_contact_email
        latest_contact_meeting: contact.most_recent_contact as string | null, // v_contact_email_composer doesn't have latest_contact_meeting
        outreach_date: contact.outreach_date as string | null,
        email_cc: contact.email_cc as string | null,
        meeting_cc: contact.meeting_cc as string | null,
        delta_type: effectiveDeltaType as 'Email' | 'Meeting' | null,
      };

      // Step 9: Log payload inputs for debugging
      console.log('🔍 Contact Draft Generator - Payload Inputs:', {
        contactId: contact.contact_id,
        contactName: contact.full_name,
        masterTemplate: masterTemplate.master_key,
        daysSinceContact,
        toneOverride: effectiveToneOverride,
        lengthOverride: effectiveLengthOverride,
        subjectPoolSize: effectiveSubjectPoolOverride.length,
        moduleStatesCount: Object.keys(effectiveModuleStates).length,
        moduleSelectionsCount: Object.keys(effectiveModuleSelections).length,
        teamSize: teamMembers.length,
        phrasesCount: allPhrases.length,
        inquiriesCount: allInquiries.length,
        subjectsCount: allSubjects.length,
        hasOpportunities: contact.has_opps,
        hasArticles: toArray(contact.articles).length > 0,
      });

      // Step 10: Build enhanced draft payload using full Email Builder logic
      const payload = await buildEnhancedDraftPayload(
        contactForPayload,
        masterTemplate,
        allPhrases,
        allInquiries,
        allSubjects,
        daysSinceContact,
        null, // selectedArticle
        effectiveToneOverride,
        effectiveSubjectPoolOverride,
        effectiveModuleOrder as string[],
        teamMembers, // curatedTeam
        effectiveCuratedTo, // curatedTo
        Array.isArray(effectiveCuratedCc) ? effectiveCuratedCc : ccEmails, // curatedCc
        teamMembers, // autoTeam
        effectiveDeltaType as 'Email' | 'Meeting',
        effectiveModuleStates,
        effectiveModuleSelections
      );
      
      console.log('📦 Enhanced Payload Built:', {
        qualityCheckPass: payload.qualityCheck.pass,
        modulesIncluded: Object.keys(payload.modulesV2 || {}).length,
        flowLength: payload.flow?.length || 0,
        interpolatedModules: payload.contentInterpolated?.modules?.length || 0,
      });

      // Step 11: Quality check
      if (!payload.qualityCheck.pass) {
        console.warn('⚠️ Quality check failed:', payload.qualityCheck.reason);
        throw new Error(payload.qualityCheck.reason || 'Quality control failed');
      }

      // Step 12: Post to n8n via edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post_to_n8n`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ payload }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to connect to the email generation service';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Ignore parse errors
        }
        throw new Error(errorMessage);
      }

      console.log('✅ Draft successfully posted to n8n');

      // Step 13: Success toast
      const contactName = contact.full_name || contact.email || 'Contact';
      toast({
        title: 'Draft Generated',
        description: `Draft for ${contactName} has been sent to Outlook`,
      });

      setIsGenerating(false);
    } catch (error) {
      console.error('❌ Contact draft generation error:', error);
      
      toast({
        title: 'Draft Generation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
      
      setIsGenerating(false);
    }
  };

  return {
    generateDraft,
    isGenerating,
    isLibrariesLoading,
  };
}
