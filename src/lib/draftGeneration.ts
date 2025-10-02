/**
 * Sophisticated Draft Generation Logic with Tri-State Evaluation, Rotation, and Quality Control
 */

import type { ContactEmailComposer } from '@/types/emailComposer';
import type { TemplateSettings, TriState, PhraseLibraryItem, MasterTemplateDefaults } from '@/types/phraseLibrary';
import type { InquiryLibraryItem } from '@/hooks/useInquiryLibrary';
import { getAvailablePhrases, getAvailableInquiries } from '@/hooks/useRotationTracking';
import { pickSignature } from '@/hooks/useSignatureLibrary';
import { pickPhrase } from '@/hooks/usePhraseLibrary';
import type { PhraseCategory } from '@/types/phraseLibrary';

interface GenerationContext {
  contact: ContactEmailComposer;
  masterTemplate: MasterTemplateDefaults;
  templateSettings?: TemplateSettings;
  allPhrases: PhraseLibraryItem[];
  allInquiries: InquiryLibraryItem[];
  selectedArticle?: string | null;
  daysSinceContact: number;
}

/**
 * Evaluate tri-state setting with probabilistic logic based on days since contact
 * "always" = 100%, "sometimes" = variable probability, "never" = 0%
 */
function evaluateTriState(
  state: TriState,
  moduleName: string,
  daysSinceContact: number,
  masterKey: string
): boolean {
  if (state === 'always') return true;
  if (state === 'never') return false;
  
  // "sometimes" logic varies by module, days, and template
  let probability = 0.5; // Base 50%
  
  // Module-specific conditional logic
  switch (moduleName) {
    case 'meeting_request':
      // Higher probability for recent contacts (0-14 days = 50%, 15-45 = 60%, 46+ = 80%)
      if (daysSinceContact <= 14) probability = 0.5;
      else if (daysSinceContact <= 45) probability = 0.6;
      else probability = 0.8;
      
      // Extra boost if there are opportunities
      // This would need contact data, so we keep it at base for now
      break;
      
    case 'article_recommendations':
      // Higher for mid-range contacts
      if (daysSinceContact <= 14) probability = 0.5;
      else if (daysSinceContact <= 90) probability = 0.7;
      else probability = 0.8;
      break;
      
    case 'platforms':
    case 'addons':
      // Higher for longer gaps (business development)
      if (daysSinceContact <= 45) probability = 0.3;
      else if (daysSinceContact <= 90) probability = 0.5;
      else probability = 0.7;
      break;
      
    case 'suggested_talking_points':
      // Moderate probability, slightly higher for longer gaps
      if (daysSinceContact <= 45) probability = 0.4;
      else probability = 0.6;
      break;
      
    case 'general_org_update':
    case 'attachments':
      // Higher for long gaps (91+)
      if (daysSinceContact <= 90) probability = 0.2;
      else probability = 0.6;
      break;
      
    case 'ai_backup_personalization':
      // Lower probability, used as fallback
      probability = 0.3;
      break;
      
    default:
      probability = 0.5;
  }
  
  return Math.random() < probability;
}

/**
 * Check module prerequisites
 */
function checkModulePrerequisites(
  module: string,
  context: GenerationContext
): boolean {
  const { contact } = context;

  switch (module) {
    case 'top_opportunities':
      return contact.has_opps && contact.opps.length > 0;
    
    case 'article_recommendations':
      return contact.articles.length > 0;
    
    case 'platforms':
      return contact.fa_descriptions.some(
        fa => fa.platform_type === 'New Platform'
      );
    
    case 'addons':
      return contact.fa_descriptions.some(
        fa => fa.platform_type === 'Add-On'
      );
    
    case 'suggested_talking_points':
      return contact.focus_areas.length > 0;
    
    case 'focus_area_defaults':
      return contact.focus_areas.length > 0;
    
    case 'team_mention':
      return contact.lead_emails.length > 0;
    
    case 'attachments':
      // Attachments require explicit file upload (checked elsewhere)
      return true;
    
    default:
      return true;
  }
}

/**
 * Select appropriate inquiry based on priority system with rotation
 */
async function selectInquiry(
  context: GenerationContext
): Promise<InquiryLibraryItem | null> {
  const { contact, allInquiries } = context;
  
  // Priority order: opportunity → article → focus_area → generic
  const priorityOrder: Array<'opportunity' | 'article' | 'focus_area' | 'generic'> = [
    'opportunity',
    'article',
    'focus_area',
    'generic'
  ];

  for (const category of priorityOrder) {
    // Check if this category is applicable
    if (category === 'opportunity' && !contact.has_opps) continue;
    if (category === 'article' && contact.articles.length === 0) continue;
    if (category === 'focus_area' && contact.focus_areas.length === 0) continue;

    // Get available inquiries for this category with rotation
    const categoryInquiries = allInquiries.filter(i => i.category === category);
    const available = await getAvailableInquiries(
      contact.contact_id,
      category,
      categoryInquiries
    );

    if (available.length > 0) {
      // Pick random from available
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  return null;
}

/**
 * Build assistant CC clause for Meeting Request module
 */
function buildAssistantClause(
  contact: ContactEmailComposer,
  meetingRequestEnabled: boolean
): string {
  if (!meetingRequestEnabled) return '';
  
  const assistants = contact.assistant_emails.filter(Boolean);
  if (assistants.length === 0) return '';

  // Extract first names from emails or use full emails
  const assistantNames = contact.assistant_names?.filter(Boolean) || [];
  
  if (assistantNames.length > 0) {
    const nameList = assistantNames.length > 1 
      ? `${assistantNames.slice(0, -1).join(', ')} and ${assistantNames[assistantNames.length - 1]}`
      : assistantNames[0];
    return `${nameList}, copied here, can coordinate logistics.`;
  }

  return 'My assistant, copied here, can coordinate logistics.';
}

/**
 * Select phrase with rotation tracking
 */
async function selectPhrase(
  contactId: string,
  category: string,
  allPhrases: PhraseLibraryItem[]
): Promise<PhraseLibraryItem | null> {
  // Use the enhanced pickPhrase function from usePhraseLibrary
  return await pickPhrase(contactId, category as PhraseCategory, allPhrases);
}

/**
 * Check quality control rules
 */
function passesQualityControl(
  context: GenerationContext,
  modules: Record<string, boolean>
): { pass: boolean; reason?: string } {
  const { contact, templateSettings } = context;
  
  if (!templateSettings?.quality_rules) {
    return { pass: true };
  }

  const rules = templateSettings.quality_rules;

  // Rule 1: Skip if no opportunities (when required)
  if (rules.skip_if_no_opps && !contact.has_opps) {
    return {
      pass: false,
      reason: 'No opportunities available for this contact'
    };
  }

  // Rule 2: Skip if no articles (when required)
  if (rules.skip_if_no_articles && contact.articles.length === 0) {
    return {
      pass: false,
      reason: 'No articles available for this contact'
    };
  }

  // Rule 3: EBITDA threshold
  if (rules.ebitda_threshold && contact.has_opps) {
    const maxEbitda = Math.max(...contact.opps.map(o => o.ebitda_in_ms || 0));
    if (maxEbitda < rules.ebitda_threshold) {
      return {
        pass: false,
        reason: `Highest EBITDA (${maxEbitda}M) below threshold (${rules.ebitda_threshold}M)`
      };
    }
  }

  return { pass: true };
}

/**
 * Build sophisticated module configuration with tri-state evaluation
 */
export async function buildModuleConfiguration(
  context: GenerationContext
): Promise<{
  modules: Record<string, boolean>;
  phrases: Record<string, PhraseLibraryItem | null>;
  inquiry: InquiryLibraryItem | null;
  assistantClause: string;
  signature: string;
  qualityCheck: { pass: boolean; reason?: string };
}> {
  const { masterTemplate, templateSettings, contact, daysSinceContact } = context;
  const modules: Record<string, boolean> = {};
  const phrases: Record<string, PhraseLibraryItem | null> = {};

  // Get default modules from master template
  const defaults = masterTemplate.default_modules || {};

  // Evaluate each module with tri-state logic
  for (const [moduleName, defaultState] of Object.entries(defaults)) {
    // Get template-specific override or use default
    const state = (templateSettings?.module_states?.[moduleName] || defaultState) as TriState;
    
    // Evaluate tri-state with probabilistic logic
    const enabled = evaluateTriState(
      state,
      moduleName,
      daysSinceContact,
      masterTemplate.master_key
    );
    
    // Check prerequisites
    const meetsPrereqs = checkModulePrerequisites(moduleName, context);
    
    // Final decision: module is active only if enabled AND prerequisites met
    modules[moduleName] = enabled && meetsPrereqs;
    
    // Special case: skip quick fillers for short gaps (0-14 days)
    if (daysSinceContact <= 14) {
      if (['general_org_update', 'platforms', 'attachments'].includes(moduleName)) {
        modules[moduleName] = false;
      }
    }
    
    // Special case: include context modules for long gaps (91+)
    if (daysSinceContact >= 91) {
      if (['general_org_update', 'suggested_talking_points'].includes(moduleName) && meetsPrereqs) {
        modules[moduleName] = true;
      }
    }
  }

  // Select phrases for enabled modules
  for (const [moduleName, enabled] of Object.entries(modules)) {
    if (enabled) {
      const phrase = await selectPhrase(
        contact.contact_id,
        moduleName,
        context.allPhrases
      );
      phrases[moduleName] = phrase;
    }
  }

  // Select inquiry (mandatory - at least 1 per email)
  let inquiry = await selectInquiry(context);

  // GUARANTEE ≥1 inquiry per email: if no inquiry selected, force one from generic pool
  if (!inquiry) {
    const genericInquiries = context.allInquiries.filter(i => i.category === 'generic');
    if (genericInquiries.length > 0) {
      const available = await getAvailableInquiries(
        contact.contact_id,
        'generic',
        genericInquiries
      );
      const pool = available.length > 0 ? available : genericInquiries;
      inquiry = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // Build assistant clause for Meeting Request
  const assistantClause = buildAssistantClause(contact, modules.meeting_request || false);

  // Select signature based on tone
  const tone = context.masterTemplate?.tone || 'hybrid';
  const signature = await pickSignature(tone as 'formal' | 'hybrid' | 'casual');

  // Quality control check
  const qualityCheck = passesQualityControl(context, modules);

  return {
    modules,
    phrases,
    inquiry,
    assistantClause,
    signature,
    qualityCheck
  };
}

/**
 * Build sophisticated content ordering
 */
export function buildContentFlow(
  masterKey: string,
  modules: Record<string, boolean>,
  hasInquiry: boolean
): string[] {
  const flow: string[] = [];

  // Personal hook (if available)
  if (modules.self_personalization) {
    flow.push('personal_hook');
  }

  // Template-specific ordering
  if (masterKey === 'relationship_maintenance') {
    // Relationship: personal_hook → top_opp → inquiry → talking_points → team_mention → focus_area_defaults → close
    if (modules.top_opportunities) flow.push('top_opportunities');
    if (hasInquiry) flow.push('inquiry');
    if (modules.suggested_talking_points) flow.push('talking_points');
    if (modules.team_mention) flow.push('team_mention');
    if (modules.focus_area_defaults) flow.push('focus_area_defaults');
    if (modules.meeting_request) flow.push('meeting_request');
  } else if (masterKey === 'hybrid_neutral') {
    // Hybrid: personal_hook → article → inquiry → top_opp → platforms/addons → team_mention → focus_area_defaults → close
    if (modules.article_recommendations) flow.push('article');
    if (hasInquiry) flow.push('inquiry');
    if (modules.top_opportunities) flow.push('top_opportunities');
    if (modules.platforms) flow.push('platforms');
    if (modules.addons) flow.push('addons');
    if (modules.team_mention) flow.push('team_mention');
    if (modules.focus_area_defaults) flow.push('focus_area_defaults');
    if (modules.meeting_request) flow.push('meeting_request');
  } else if (masterKey === 'business_development') {
    // BD: personal_hook → article → top_opp → inquiry → platforms → addons → org_update → attachments → team_mention → focus_area_defaults → close
    if (modules.article_recommendations) flow.push('article');
    if (modules.top_opportunities) flow.push('top_opportunities');
    if (hasInquiry) flow.push('inquiry');
    if (modules.platforms) flow.push('platforms');
    if (modules.addons) flow.push('addons');
    if (modules.general_org_update) flow.push('org_update');
    if (modules.attachments) flow.push('attachments');
    if (modules.team_mention) flow.push('team_mention');
    if (modules.focus_area_defaults) flow.push('focus_area_defaults');
    if (modules.meeting_request) flow.push('meeting_request');
  }

  return flow;
}

/**
 * Build assistant CC list based on delta type
 */
export function buildAssistantCC(
  contact: ContactEmailComposer,
  deltaType: 'Email' | 'Meeting'
): string[] {
  if (deltaType !== 'Meeting') return [];
  
  // Return unique assistant emails
  return Array.from(new Set(contact.assistant_emails.filter(Boolean)));
}