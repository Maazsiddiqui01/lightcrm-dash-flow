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
  
  // Resolved content from libraries
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
    selection?: {
      type: 'phrase' | 'article';
      category?: string;
      phraseId?: string;
      text?: string;
      variables?: Record<string, any>;
      articleId?: string;
      articleUrl?: string;
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
  moduleSelections?: Record<string, any>
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

  // Resolve phrases for enabled modules
  const resolvedPhrases: Record<string, string> = {};
  const phraseIds: string[] = [];
  
  for (const [moduleName, phrase] of Object.entries(generation.phrases)) {
    if (phrase) {
      resolvedPhrases[moduleName] = phrase.phrase_text;
      phraseIds.push(phrase.id);
    }
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
  const subjectPool = subjectPoolOverride && subjectPoolOverride.length > 0
    ? allSubjects.filter(s => subjectPoolOverride.includes(s.id))
    : allSubjects;
  
  // Validate primary subject ID exists
  const primarySubjectId = moduleSelections?.subject_line_pool?.defaultSubjectId || subjectPoolOverride?.[0];
  
  if (!primarySubjectId) {
    throw new Error('Subject Line Pool must have a primary subject selected');
  }
  
  if (subjectPool.length === 0) {
    throw new Error('Subject Line Pool must have at least one enabled subject');
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

  // Build modulesV2 with detailed selection data (COMPASS)
  const modulesV2 = buildModuleSequence(
    orderedModules,
    moduleStates || {}
  ).map(item => {
    const selection = moduleSelections?.[item.key as keyof typeof moduleSelections];
    const moduleKey = item.key as keyof ModuleStates;
    
    // Base module object
    const module: any = {
      key: item.key,
      position: item.position,
      mode: item.mode,
    };
    
    // Add selection data if available
    if (selection) {
      if (selection.type === 'article') {
        module.selection = {
          type: 'article',
          articleId: selection.articleId,
          articleUrl: selection.articleUrl,
        };
      } else if (selection.type === 'phrase' || selection.phraseId || selection.greetingId) {
        module.selection = {
          type: 'phrase',
          category: selection.category,
          phraseId: selection.phraseId || selection.greetingId,
          text: selection.phraseText,
          variables: selection.variables,
        };
      } else if (selection.phraseIds && selection.phraseIds.length > 0) {
        // Multi-select phrases
        module.selection = {
          type: 'phrase',
          category: selection.category,
          phraseIds: selection.phraseIds,
          variables: selection.variables,
        };
      }
    }
    
    return module;
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
  let groupMembers: { to: Array<{ email: string; fullName: string }>; cc: Array<{ email: string; fullName: string }>; bcc: Array<{ email: string; fullName: string }> } | null = null;
  
  if ((contact as any).group_contact) {
    const { data: membersData } = await supabase
      .from('contacts_raw')
      .select('email_address, full_name, group_email_role')
      .eq('group_contact', (contact as any).group_contact)
      .not('group_email_role', 'is', null);
    
    if (membersData) {
      groupMembers = {
        to: membersData.filter(m => m.group_email_role === 'to').map(m => ({ email: m.email_address, fullName: m.full_name })),
        cc: membersData.filter(m => m.group_email_role === 'cc').map(m => ({ email: m.email_address, fullName: m.full_name })),
        bcc: membersData.filter(m => m.group_email_role === 'bcc').map(m => ({ email: m.email_address, fullName: m.full_name })),
      };
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
    modules: generation.modules,
    flow,
    moduleSequence,
    modulesV2,
    cc: {
      leads: leadEmails,
      assistants: assistantEmails,
      final: [...leadEmails, ...assistantEmails].filter((email, index, self) => 
        self.indexOf(email) === index
      ),
    },
    qualityCheck: generation.qualityCheck,
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
