/**
 * Enhanced Payload Builder with Database-Driven Content
 * Integrates phrase library, inquiry library, subject library, signature library
 * with rotation tracking and quality control
 */

import type { ContactEmailComposer } from '@/types/emailComposer';
import type { PhraseLibraryItem, TriState, MasterTemplateDefaults } from '@/types/phraseLibrary';
import type { InquiryLibraryItem } from '@/hooks/useInquiryLibrary';
import type { SubjectLibraryItem } from '@/hooks/useSubjectLibrary';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import { pickPhrase, logPhraseUsage } from '@/hooks/usePhraseLibrary';
import { pickInquiry, logInquiryUse } from '@/hooks/useInquiryLibrary';
import { pickSubject } from '@/hooks/useSubjectLibrary';
import { pickSignature } from '@/hooks/useSignatureLibrary';
import { fetchContactMetadata } from '@/hooks/useContextFetching';
import { buildModuleConfiguration, buildContentFlow } from './draftGeneration';
import { supabase } from '@/integrations/supabase/client';
import { buildModuleSequence } from './modulePositions';
import { interpolateContent } from './contentInterpolation';
import { pickRandomPhrase, generateSeed } from './randomization';
import { hasInsuranceServicesFocusArea } from '@/utils/focusAreaDetection';

export interface FocusAreaLanguagePayload {
  focusArea: string;
  type: string;
  existingPlatform?: string;
  description: string;
  useInEmail: boolean;
}

export interface EnhancedDraftPayload {
  // Core contact info
  contact: {
    id: string;
    email: string;
    fullName: string;
    firstName: string;
    organization: string;
    groupContact: string | null;
    groupEmailRole: 'to' | 'cc' | 'bcc' | null;
  };
  
  // Group members (if contact is part of a group)
  groupMembers: {
    to: Array<{ email: string; fullName: string }>;
    cc: Array<{ email: string; fullName: string }>;
    bcc: Array<{ email: string; fullName: string }>;
  } | null;
  
  // Curated recipients (user-edited TO/CC)
  recipients?: {
    to: string;
    cc: string[];
  };
  
  // Team curation tracking
  teamCuration?: {
    initialAutoCount: number;
    keptIds: string[];
    removedIds: string[];
    addedIds: string[];
  };
  
  // Focus areas with descriptions
  focusAreas: {
    list: string[];
    descriptions: Array<{
      focusArea: string;
      description: string;
      sector: string;
      platformAddon: string;
    }>;
    platforms: string[];
    addons: string[];
    hasInsuranceServices: boolean;  // Flag for Insurance Services focus area
  };
  
  // Opportunities (Active Tier 1 only, no cap)
  opportunities: {
    hasOpps: boolean;
    active_tier1: Array<{
      id: string;
      dealName: string;
      ebitda: number | null;
      tier: string | null;
      status: string | null;
      updatedAt: string | null;
    }>;
    // Legacy field for backward compatibility (first 3)
    top_opportunities_legacy: Array<{
      id: string;
      dealName: string;
      ebitda: number | null;
      tier: string | null;
    }>;
  };
  
  // Articles
  articles: {
    selected: string | null;
    available: Array<{
      focusArea: string | null;
      link: string;
      lastDate: string | null;
    }>;
  };
  
  // Routing & template
  routing: {
    masterKey: string;
    tone: 'casual' | 'hybrid' | 'formal';
    subjectStyle: 'casual' | 'mixed' | 'formal';
    daysSinceContact: number;
    deltaType: 'Email' | 'Meeting';
  };
  
  // Resolved content from libraries (RAW - with placeholders)
  content: {
    subject: string;
    greeting: string | null;
    phrases: Record<string, string>;
    inquiry: {
      text: string;
      category: string;
    } | null;
    signature: string;
    assistantClause: string;
  };
  
  // Pre-interpolated content (NEW - ready for n8n)
  contentInterpolated: {
    subject: string;
    greeting: string;
    modules: Array<{
      key: string;
      position: number;
      label: string;
      state: TriState;
      content: string;
    }>;
    signature: string;
    ccList: string[];
  };
  
  // Module states
  modules: Record<string, boolean>;
  
  // Content flow order
  flow: string[];
  
  // Module sequence with position metadata
  moduleSequence: Array<{
    id: string;
    position: number;
    enabled: boolean;
  }>;
  
  // ModulesV2 with detailed selection data (COMPASS enhancement)
  modulesV2: Array<{
    key: string;
    position: number;
    mode: TriState;
    customLabel?: string;
    selection?: {
      type?: 'phrase' | 'article' | 'inquiry' | 'subject';
      category?: string;
      phraseId?: string;
      defaultPhraseId?: string;
      text?: string;
      variables?: Record<string, any>;
      articleId?: string;
      articleUrl?: string;
      inquiryId?: string;
      inquiryText?: string;
      subjectIds?: string[];
      primaryId?: string;
      style?: 'formal' | 'hybrid' | 'casual';
    };
  }>;
  
  // CC recipients
  cc: {
    leads: string[];
    assistants: string[];
    final: string[];
  };
  
  // Quality control
  qualityCheck: {
    pass: boolean;
    reason?: string;
  };
  
  // Focus area language override for Focus Area Rationale
  focusAreaLanguage?: FocusAreaLanguagePayload;
  
  // Tracking IDs for rotation logging
  tracking: {
    phraseIds: string[];
    inquiryId: string | null;
  };
}

/**
 * Build comprehensive draft payload with database-driven content
 */
export async function buildEnhancedDraftPayload(
  contact: ContactEmailComposer,
  masterTemplate: MasterTemplateDefaults,
  allPhrases: PhraseLibraryItem[],
  allInquiries: InquiryLibraryItem[],
  allSubjects: SubjectLibraryItem[],
  daysSinceContact: number,
  selectedArticle?: string | null,
  toneOverride?: 'casual' | 'hybrid' | 'formal',
  subjectPoolOverride?: string[],
  moduleOrder?: Array<string>,
  curatedTeam?: Array<{ id: string; name: string; email: string; role: string }>,
  curatedTo?: string,
  curatedCc?: string[],
  autoTeam?: Array<{ id: string; name: string; email: string; role: string }>,
  deltaType?: 'Email' | 'Meeting',
  moduleStates?: Record<string, any>,
  moduleSelections?: Record<string, any>,
  focusAreaLanguage?: FocusAreaLanguagePayload | null
): Promise<EnhancedDraftPayload> {
  // Calculate effective tone
  const effectiveTone = toneOverride || masterTemplate.tone || 'hybrid';
  
  // Fetch additional contact metadata (focus area descriptions, opportunities, etc.)
  const metadata = await fetchContactMetadata(
    contact.full_name,
    contact.focus_areas.join(', ')
  );

  // Build module configuration with quality control
  const generation = await buildModuleConfiguration({
    contact,
    masterTemplate,
    allPhrases,
    allInquiries,
    selectedArticle,
    daysSinceContact,
  });

  // Early return if quality control fails
  if (!generation.qualityCheck.pass) {
    return createFailedPayload(contact, generation.qualityCheck.reason || 'Quality control failed');
  }

  // Generate seed for consistent randomization per draft session
  const draftSeed = generateSeed(contact.contact_id);
  
  // Resolve phrases for enabled modules with auto-randomization
  const resolvedPhrases: Record<string, string> = {};
  const phraseIds: string[] = [];
  
  // Module to category mapping
  const MODULE_LIBRARY_MAP: Record<string, string> = {
    initial_greeting: 'greeting',
    self_personalization: 'self_personalization',
    top_opportunities: 'top_opportunities',
    article_recommendations: 'article_recommendation',
    platforms: 'platforms',
    addons: 'addons',
    suggested_talking_points: 'talking_points',
    general_org_update: 'general_org_update',
    meeting_request: 'meeting_request',
    closing_line: 'closing_line',
  };
  
  let moduleIndex = 0;
  for (const [moduleName, phrase] of Object.entries(generation.phrases)) {
    // Check if user has manually selected a phrase for this module
    const selection = moduleSelections?.[moduleName];
    
    if (selection?.phraseId) {
      // User selected a specific phrase - use it exactly
      const savedPhrase = allPhrases.find(p => p.id === selection.phraseId);
      if (savedPhrase) {
        resolvedPhrases[moduleName] = savedPhrase.phrase_text;
        phraseIds.push(savedPhrase.id);
        moduleIndex++;
        continue;
      }
    }
    
    // No manual selection - apply auto-randomization
    if (phrase) {
      // Use phrase from buildModuleConfiguration (which already selected one)
      resolvedPhrases[moduleName] = phrase.phrase_text;
      phraseIds.push(phrase.id);
    } else {
      // Fallback: pick random phrase from library for this module
      const category = MODULE_LIBRARY_MAP[moduleName];
      if (category) {
        let candidatePhrases = allPhrases.filter(p => 
          p.category === category &&
          p.tri_state !== 'never'
        );
        
        // Apply tone filtering for greeting modules
        if (moduleName === 'initial_greeting' && effectiveTone) {
          candidatePhrases = candidatePhrases.filter(p => 
            p.style === effectiveTone || p.style === 'hybrid'
          );
        }
        
        // Pick random phrase with seeded RNG
        const randomPhrase = pickRandomPhrase(candidatePhrases, draftSeed + moduleIndex);
        if (randomPhrase) {
          resolvedPhrases[moduleName] = randomPhrase.phrase_text;
          phraseIds.push(randomPhrase.id);
        }
      }
    }
    
    moduleIndex++;
  }

  // Resolve inquiry
  let inquiryData: { text: string; category: string } | null = null;
  let inquiryId: string | null = null;
  
  if (generation.inquiry) {
    inquiryData = {
      text: generation.inquiry.inquiry_text,
      category: generation.inquiry.category,
    };
    inquiryId = generation.inquiry.id;
  }

  // Pick subject line with tone and subject pool override
  // Enhanced validation: Check for deleted subjects in pool override (FIX #3: Stale Subject Pool Auto-Recovery)
  let subjectPool: SubjectLibraryItem[];
  const deletedSubjectIds: string[] = [];
  let notifiedUser = false; // Track if we've shown toast notification
  
  if (subjectPoolOverride && subjectPoolOverride.length > 0) {
    // Filter to override subjects and track deleted ones
    subjectPool = [];
    for (const overrideId of subjectPoolOverride) {
      const subject = allSubjects.find(s => s.id === overrideId);
      if (subject) {
        subjectPool.push(subject);
      } else {
        deletedSubjectIds.push(overrideId);
      }
    }
    
    // FIX #3: Show user-friendly notification about deleted subjects
    if (deletedSubjectIds.length > 0) {
      console.warn(`⚠️ Subject pool contains ${deletedSubjectIds.length} deleted subject(s): ${deletedSubjectIds.join(', ')}`);
      
      // Dynamically import toast to avoid circular dependency
      import('@/hooks/use-toast').then(({ toast }) => {
        if (!notifiedUser) {
          toast({
            title: "Deleted Subjects Detected",
            description: `${deletedSubjectIds.length} subject line${deletedSubjectIds.length > 1 ? 's' : ''} in your pool ${deletedSubjectIds.length > 1 ? 'have' : 'has'} been deleted. Auto-selecting from available subjects.`,
            variant: "destructive",
            duration: 6000,
          });
          notifiedUser = true;
        }
      }).catch(err => {
        console.error('Failed to show toast notification:', err);
      });
    }
    
    // If filtering resulted in empty pool (all IDs invalid/deleted), fall back to all subjects
    if (subjectPool.length === 0) {
      console.error('❌ Subject pool override contained only invalid/deleted IDs. Falling back to all available subjects.');
      
      // Show recovery notification
      import('@/hooks/use-toast').then(({ toast }) => {
        if (!notifiedUser) {
          toast({
            title: "Subject Pool Empty",
            description: "All subjects in your pool were deleted. Using library defaults.",
            variant: "destructive",
            duration: 6000,
          });
          notifiedUser = true;
        }
      }).catch(err => {
        console.error('Failed to show toast notification:', err);
      });
      
      subjectPool = allSubjects;
    }
  } else {
    subjectPool = allSubjects;
  }
  
  // Validate pool has at least one subject
  if (subjectPool.length === 0) {
    throw new Error('Subject Line Pool is empty. Please add at least one subject line to the library.');
  }
  
  // FIX #2: Enforce subject style from master template
  // Filter subject pool to match the style if specified (mixed = no filtering)
  if (masterTemplate?.subject_style && masterTemplate.subject_style !== 'mixed') {
    const requiredStyle = masterTemplate.subject_style as 'formal' | 'casual';
    const originalCount = subjectPool.length;
    subjectPool = subjectPool.filter(s => s.style === requiredStyle || s.style === 'hybrid');
    
    // If filtering removes all subjects, warn and use hybrid fallback
    if (subjectPool.length === 0) {
      console.warn(`⚠️ No subjects available for style '${requiredStyle}'. Using hybrid subjects as fallback.`);
      subjectPool = allSubjects.filter(s => s.style === 'hybrid');
      
      // If still empty, use all subjects
      if (subjectPool.length === 0) {
        console.error('❌ No hybrid subjects available. Using all subjects.');
        subjectPool = allSubjects;
      }
    } else if (originalCount > subjectPool.length) {
      console.log(`✅ Filtered subject pool to ${subjectPool.length} ${requiredStyle} subjects (from ${originalCount} total)`);
    }
  }
  
  // Auto-select primary subject if not specified (renamed from subject_line_pool to subject_line)
  let primarySubjectId = moduleSelections?.subject_line?.defaultSubjectId;
  
  // Check if primary subject was deleted (FIX #3: Auto-select new primary with notification)
  if (primarySubjectId && deletedSubjectIds.includes(primarySubjectId)) {
    console.warn(`⚠️ Primary subject ${primarySubjectId} was deleted. Auto-selecting new primary: ${subjectPool[0].subject_template}`);
    
    // Show confirmation notification
    import('@/hooks/use-toast').then(({ toast }) => {
      if (!notifiedUser) {
        toast({
          title: "Primary Subject Updated",
          description: `Your default subject was deleted. New default: "${subjectPool[0].subject_template.slice(0, 50)}${subjectPool[0].subject_template.length > 50 ? '...' : ''}"`,
          duration: 5000,
        });
        notifiedUser = true;
      }
    }).catch(err => {
      console.error('Failed to show toast notification:', err);
    });
    
    primarySubjectId = undefined;
  }
  
  if (!primarySubjectId && subjectPoolOverride && subjectPoolOverride.length > 0) {
    // Use first valid subject from pool (after filtering out deleted ones)
    primarySubjectId = subjectPool[0].id;
  }
  
  if (!primarySubjectId) {
    // Auto-select first available subject
    primarySubjectId = subjectPool[0].id;
    console.log(`✓ Auto-selected primary subject: ${subjectPool[0].subject_template}`);
  }
  
  // Validate primary subject exists in pool (final safety check)
  const primaryExists = subjectPool.some(s => s.id === primarySubjectId);
  if (!primaryExists) {
    console.warn(`⚠️ Primary subject ${primarySubjectId} not in pool. Auto-selecting first available.`);
    primarySubjectId = subjectPool[0].id;
  }
    
  const subject = await pickSubject({
    tone: effectiveTone,
    org: contact.organization || 'Organization',
    focusAreas: metadata.focusAreas,
    sector: metadata.focusAreaDescriptions[0]?.sector,
    subjects: subjectPool,
  });

  // Build greeting (first name)
  const greeting = resolvedPhrases.greeting || `Hi ${contact.first_name}`;

  // Build content flow
  const flow = buildContentFlow(
    masterTemplate.master_key,
    generation.modules,
    !!generation.inquiry
  );

  // Build module sequence with position metadata using validated utility
  const orderedModules = moduleOrder || Object.keys(generation.modules);
  const moduleSequence = buildModuleSequence(
    orderedModules,
    moduleStates || {}
  ).map(item => ({
    id: item.key,
    position: item.position,
    enabled: generation.modules[item.key] || false,
    mode: item.mode,
  }));

  // Build modulesV2 (new format with position + selection details)
  const modulesV2: Array<{
    key: string;
    position: number;
    mode: TriState;
    customLabel?: string;
    selection: {
      type?: 'phrase' | 'article' | 'inquiry' | 'subject';
      category?: string;
      phraseId?: string;
      defaultPhraseId?: string;
      text?: string;
      articleId?: string;
      articleUrl?: string;
      inquiryId?: string;
      inquiryText?: string;
      subjectIds?: string[];
      primaryId?: string;
      style?: 'formal' | 'hybrid' | 'casual';
      variables?: Record<string, any>;
    };
  }> = [];

  // Add subject line as position 0 with style (renamed from subject_line_pool to subject_line)
  const subjectSelection = moduleSelections?.subject_line;
  const subjectStyle = subjectSelection?.style || effectiveTone;
  
  if (subjectPoolOverride && subjectPoolOverride.length > 0 && primarySubjectId) {
    modulesV2.push({
      key: 'subject_line',
      position: 0,
      mode: 'always',
      selection: {
        type: 'subject',
        subjectIds: subjectPoolOverride,
        primaryId: primarySubjectId,
        style: subjectStyle,
      },
    });
  }

  // Add content modules with custom labels and default phrase IDs
  buildModuleSequence(orderedModules, moduleStates || {}).forEach((item) => {
    const module = item.key;
    const position = item.position;
    const mode = item.mode;
    const selection = moduleSelections?.[module as keyof typeof moduleSelections];

    if (!selection || mode === 'never') {
      modulesV2.push({
        key: module,
        position,
        mode: mode as TriState,
        selection: {},
      });
      return;
    }

    // Build selection object based on type
    const selectionData: any = {};

    // Handle phrase-based modules
    if (selection.phraseId || selection.phraseText) {
      selectionData.type = 'phrase';
      selectionData.category = selection.category;
      selectionData.phraseId = selection.phraseId;
      selectionData.defaultPhraseId = selection.defaultPhraseId; // Include starred default (HIGH-3 fix)
      selectionData.text = selection.phraseText;
      selectionData.variables = selection.variables;
    }

    // Handle article module
    if (selection.articleId) {
      selectionData.type = 'article';
      selectionData.articleId = selection.articleId;
      selectionData.articleUrl = selection.articleUrl;
    }

    // Handle inquiry module
    if (selection.inquiryId) {
      selectionData.type = 'inquiry';
      selectionData.inquiryId = selection.inquiryId;
      selectionData.inquiryText = allInquiries.find(i => i.id === selection.inquiryId)?.inquiry_text;
    }

    modulesV2.push({
      key: module,
      position,
      mode: mode as TriState,
      selection: selectionData,
    });
  });

  // Build CC list from team directory (fetch emails from database)
  const leadEmails: string[] = [];
  const assistantEmails: string[] = [];
  
  for (const focusArea of metadata.focusAreas) {
    const { data: teamDataArray } = await supabase
      .from('lg_focus_area_directory' as any)
      .select('lead1_email, lead2_email, assistant_email')
      .eq('focus_area', focusArea);
    
    if (teamDataArray && Array.isArray(teamDataArray) && teamDataArray.length > 0) {
      const teamData = teamDataArray[0] as { lead1_email?: string; lead2_email?: string; assistant_email?: string };
      if (teamData.lead1_email) leadEmails.push(teamData.lead1_email);
      if (teamData.lead2_email) leadEmails.push(teamData.lead2_email);
      if (teamData.assistant_email) assistantEmails.push(teamData.assistant_email);
    }
  }

  // Categorize focus areas into platforms and addons
  const platforms = metadata.focusAreaDescriptions
    .filter(fa => fa.platformAddon.toLowerCase().includes('platform'))
    .map(fa => fa.focusArea);
    
  const addons = metadata.focusAreaDescriptions
    .filter(fa => fa.platformAddon.toLowerCase().includes('add-on'))
    .map(fa => fa.focusArea);

  // Fetch group members if contact is part of a group
  // FIX ISSUE #5: Add error handling for group members query
  let groupMembers: { to: Array<{ email: string; fullName: string }>; cc: Array<{ email: string; fullName: string }>; bcc: Array<{ email: string; fullName: string }> } | null = null;
  
  if ((contact as any).group_contact) {
    const { data: membersData, error: groupError } = await supabase
      .from('contacts_raw')
      .select('email_address, full_name, group_email_role')
      .eq('group_contact', (contact as any).group_contact)
      .not('group_email_role', 'is', null);
    
    if (groupError) {
      console.error('Failed to fetch group members:', groupError);
      throw new Error(`Failed to fetch group members for ${(contact as any).group_contact}: ${groupError.message}`);
    }
    
    if (membersData && membersData.length > 0) {
      groupMembers = {
        to: membersData.filter(m => m.group_email_role === 'to').map(m => ({ email: m.email_address, fullName: m.full_name })),
        cc: membersData.filter(m => m.group_email_role === 'cc').map(m => ({ email: m.email_address, fullName: m.full_name })),
        bcc: membersData.filter(m => m.group_email_role === 'bcc').map(m => ({ email: m.email_address, fullName: m.full_name })),
      };
    } else {
      console.warn(`No group members found for group: ${(contact as any).group_contact}`);
    }
  }

  // Build recipients and team curation if provided
  const recipients = curatedTo && curatedCc ? {
    to: curatedTo,
    cc: curatedCc,
  } : undefined;

  const teamCuration = curatedTeam && autoTeam ? {
    initialAutoCount: autoTeam.length,
    keptIds: curatedTeam.filter(m => autoTeam.some(a => a.id === m.id)).map(m => m.id),
    removedIds: autoTeam.filter(m => !curatedTeam.some(c => c.id === m.id)).map(m => m.id),
    addedIds: curatedTeam.filter(m => !autoTeam.some(a => a.id === m.id)).map(m => m.id),
  } : undefined;

  // ===== Build Interpolated Content (NEW) =====
  
  // Module labels map (custom labels from moduleSelections)
  const MODULE_LABELS: Record<string, string> = {
    initial_greeting: "Initial Greeting",
    self_personalization: "Self Personalization",
    top_opportunities: "Top Opportunities",
    article_recommendations: "Article Recommendations",
    platforms: "Platforms",
    addons: "Add-ons",
    suggested_talking_points: "Suggested Talking Points",
    general_org_update: "General Org Update",
    attachments: "Attachments",
    meeting_request: "Meeting Request",
    ai_backup_personalization: "AI Backup Personalization",
  };

  const interpolatedModules: Array<{
    key: string;
    position: number;
    label: string;
    state: TriState;
    content: string;
  }> = [];

  // Convert opportunities to the expected format for interpolation
  const opportunitiesForInterpolation = metadata.topOpportunities.map(opp => ({
    deal_name: opp.dealName,
    ebitda_in_ms: opp.ebitda,
  }));

  // Convert focus area descriptions to the expected format for interpolation
  const focusAreaDescriptionsForInterpolation = metadata.focusAreaDescriptions.map(fa => ({
    focus_area: fa.focusArea,
    description: fa.description,
    platform_type: fa.platformAddon,
    sector: fa.sector,
  }));

  // Use moduleSequence (which respects UI order) to build interpolated content
  for (const module of moduleSequence) {
    const rawContent = resolvedPhrases[module.id] || '';
    const customLabel = moduleSelections?.[module.id as keyof typeof moduleSelections]?.customLabel;
    const effectiveLabel = customLabel || MODULE_LABELS[module.id] || module.id;
    const state = (module as any).mode || 'never';
    
    if (state !== 'never' && rawContent) {
      // Special handling for article_recommendations: inject article URL
      let contentToInterpolate = rawContent;
      if (module.id === 'article_recommendations' && selectedArticle) {
        // Find the article object from contact.articles
        const articleObj = contact.articles.find(a => a.article_link === selectedArticle);
        if (articleObj) {
          // Replace {article_url} placeholder with actual article URL
          contentToInterpolate = contentToInterpolate.replace(/{article_url}/g, articleObj.article_link || '');
          contentToInterpolate = contentToInterpolate.replace(/{article_title}/g, articleObj.article_link || '');
          contentToInterpolate = contentToInterpolate.replace(/{focus_area}/g, articleObj.focus_area || '');
        }
      }
      
      interpolatedModules.push({
        key: module.id,
        position: module.position,
        label: effectiveLabel,
        state: state as TriState,
        content: interpolateContent(
          contentToInterpolate,
          contact,
          opportunitiesForInterpolation,
          focusAreaDescriptionsForInterpolation
        ),
      });
    }
  }

  // Interpolate subject
  const interpolatedSubject = interpolateContent(
    subject,
    contact,
    opportunitiesForInterpolation,
    focusAreaDescriptionsForInterpolation
  );

  // Interpolate greeting
  const interpolatedGreeting = interpolateContent(
    greeting,
    contact,
    opportunitiesForInterpolation,
    focusAreaDescriptionsForInterpolation
  );

  // Interpolate signature (may contain placeholders like [Assistant])
  const interpolatedSignature = interpolateContent(
    generation.signature,
    contact,
    opportunitiesForInterpolation,
    focusAreaDescriptionsForInterpolation
  );

  const finalCcList = recipients?.cc || [...leadEmails, ...assistantEmails].filter((email, index, self) => 
    self.indexOf(email) === index
  );

  // Phase 9: E2E Payload Testing - Console logging for debugging
  console.log('📧 Enhanced Email Payload Generated:', {
    contactId: contact.contact_id,
    contactName: contact.full_name,
    subject: interpolatedSubject,
    greeting: interpolatedGreeting,
    moduleCount: interpolatedModules.length,
    modules: interpolatedModules.map(m => ({
      label: m.label,
      content: m.content.substring(0, 100) + '...',
    })),
    cc: finalCcList,
    qualityPass: generation.qualityCheck.pass,
    trackingPhraseIds: phraseIds,
  });

  return {
    contact: {
      id: contact.contact_id,
      email: contact.email,
      fullName: contact.full_name,
      firstName: contact.first_name,
      organization: contact.organization || '',
      groupContact: (contact as any).group_contact || null,
      groupEmailRole: (contact as any).group_email_role || null,
    },
    groupMembers,
    recipients,
    teamCuration,
    focusAreas: {
      list: metadata.focusAreas,
      descriptions: metadata.focusAreaDescriptions.map(desc => ({
        focusArea: desc.focusArea,
        description: desc.description,
        sector: desc.sector,
        platformAddon: desc.platformAddon,
      })),
      platforms,
      addons,
      hasInsuranceServices: hasInsuranceServicesFocusArea(metadata.focusAreas),
    },
    opportunities: {
      hasOpps: metadata.topOpportunities.length > 0,
      active_tier1: metadata.topOpportunities.map(opp => ({
        id: opp.id,
        dealName: opp.dealName,
        ebitda: opp.ebitda,
        tier: opp.tier,
        status: opp.status,
        updatedAt: opp.updatedAt,
      })),
      // Legacy field: first 3 for backward compatibility
      top_opportunities_legacy: metadata.topOpportunities.slice(0, 3).map(opp => ({
        id: opp.id,
        dealName: opp.dealName,
        ebitda: opp.ebitda,
        tier: opp.tier,
      })),
    },
    articles: {
      selected: selectedArticle || null,
      available: contact.articles.map(article => ({
        focusArea: article.focus_area || null,
        link: article.article_link,
        lastDate: article.last_date_to_use || null,
      })),
    },
    routing: {
      masterKey: masterTemplate.master_key,
      tone: effectiveTone,
      subjectStyle: masterTemplate.subject_style || 'mixed',
      daysSinceContact,
      deltaType: deltaType || 'Email',
    },
    content: {
      subject,
      greeting,
      phrases: resolvedPhrases,
      inquiry: inquiryData,
      signature: generation.signature,
      assistantClause: generation.assistantClause,
    },
    contentInterpolated: {
      subject: interpolatedSubject,
      greeting: interpolatedGreeting,
      modules: interpolatedModules,
      signature: interpolatedSignature,
      ccList: finalCcList,
    },
    modules: generation.modules,
    flow,
    moduleSequence,
    modulesV2,
    cc: {
      leads: leadEmails,
      assistants: assistantEmails,
      final: finalCcList,
    },
    qualityCheck: generation.qualityCheck,
    focusAreaLanguage: focusAreaLanguage && focusAreaLanguage.useInEmail ? focusAreaLanguage : undefined,
    tracking: {
      phraseIds,
      inquiryId,
    },
  };
}

/**
 * Log usage of phrases and inquiries for rotation tracking
 */
export async function logPayloadUsage(
  contactId: string,
  tracking: { phraseIds: string[]; inquiryId: string | null }
): Promise<void> {
  try {
    // Log phrase usage
    for (const phraseId of tracking.phraseIds) {
      await logPhraseUsage(contactId, phraseId);
    }
    
    // Log inquiry usage
    if (tracking.inquiryId) {
      await logInquiryUse({ contactId, inquiryId: tracking.inquiryId });
    }
  } catch (error) {
    console.error('Failed to log payload usage (non-blocking):', error);
  }
}

/**
 * Create failed payload when quality control fails
 */
function createFailedPayload(
  contact: ContactEmailComposer,
  reason: string
): EnhancedDraftPayload {
  return {
    contact: {
      id: contact.contact_id,
      email: contact.email,
      fullName: contact.full_name,
      firstName: contact.first_name,
      organization: contact.organization || '',
      groupContact: (contact as any).group_contact || null,
      groupEmailRole: (contact as any).group_email_role || null,
    },
    groupMembers: null,
    focusAreas: {
      list: [],
      descriptions: [],
      platforms: [],
      addons: [],
      hasInsuranceServices: false,
    },
    opportunities: {
      hasOpps: false,
      active_tier1: [],
      top_opportunities_legacy: [],
    },
    articles: {
      selected: null,
      available: [],
    },
    routing: {
      masterKey: 'relationship_maintenance',
      tone: 'hybrid',
      subjectStyle: 'mixed',
      daysSinceContact: 0,
      deltaType: 'Email',
    },
    content: {
      subject: '',
      greeting: null,
      phrases: {},
      inquiry: null,
      signature: '',
      assistantClause: '',
    },
    contentInterpolated: {
      subject: '',
      greeting: '',
      modules: [],
      signature: '',
      ccList: [],
    },
    modules: {},
    flow: [],
    moduleSequence: [],
    modulesV2: [],
    cc: {
      leads: [],
      assistants: [],
      final: [],
    },
    qualityCheck: {
      pass: false,
      reason,
    },
    tracking: {
      phraseIds: [],
      inquiryId: null,
    },
  };
}
