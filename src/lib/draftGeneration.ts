/**
 * Sophisticated Draft Generation Logic with Tri-State Evaluation, Rotation, and Quality Control
 */

import type { ContactEmailComposer } from '@/types/emailComposer';
import type { TemplateSettings, TriState, PhraseLibraryItem, MasterTemplateDefaults } from '@/types/phraseLibrary';
import type { InquiryLibraryItem } from '@/hooks/useInquiryLibrary';
import { getAvailablePhrases, getAvailableInquiries } from '@/hooks/useRotationTracking';

interface GenerationContext {
  contact: ContactEmailComposer;
  masterTemplate: MasterTemplateDefaults;
  templateSettings?: TemplateSettings;
  allPhrases: PhraseLibraryItem[];
  allInquiries: InquiryLibraryItem[];
  selectedArticle?: string | null;
}

/**
 * Evaluate tri-state setting (always, sometimes, never)
 * "always" = 100%, "sometimes" = 70%, "never" = 0%
 */
function evaluateTriState(state: TriState): boolean {
  if (state === 'always') return true;
  if (state === 'never') return false;
  // "sometimes" = 70% chance
  return Math.random() < 0.7;
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
    
    default:
      return true;
  }
}

/**
 * Select appropriate inquiry based on priority system
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

    // Get available inquiries for this category
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
 * Select phrase with rotation tracking
 */
async function selectPhrase(
  contactId: string,
  category: string,
  allPhrases: PhraseLibraryItem[]
): Promise<PhraseLibraryItem | null> {
  const categoryPhrases = allPhrases.filter(p => p.category === category);
  
  if (categoryPhrases.length === 0) return null;

  const available = await getAvailablePhrases(contactId, category, categoryPhrases);
  
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }

  return null;
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
  qualityCheck: { pass: boolean; reason?: string };
}> {
  const { masterTemplate, templateSettings, contact } = context;
  const modules: Record<string, boolean> = {};
  const phrases: Record<string, PhraseLibraryItem | null> = {};

  // Get default modules from master template
  const defaults = masterTemplate.default_modules || {};

  // Evaluate each module with tri-state logic
  for (const [moduleName, defaultState] of Object.entries(defaults)) {
    // Get template-specific override or use default
    const state = (templateSettings?.module_states?.[moduleName] || defaultState) as TriState;
    
    // Evaluate tri-state
    const enabled = evaluateTriState(state);
    
    // Check prerequisites
    const meetsPrereqs = checkModulePrerequisites(moduleName, context);
    
    // Final decision
    modules[moduleName] = enabled && meetsPrereqs;
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
  const inquiry = await selectInquiry(context);

  // Quality control check
  const qualityCheck = passesQualityControl(context, modules);

  return {
    modules,
    phrases,
    inquiry,
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
    // Relationship: personal_hook → top_opp → inquiry → talking_points → close
    if (modules.top_opportunities) flow.push('top_opportunities');
    if (hasInquiry) flow.push('inquiry');
    if (modules.suggested_talking_points) flow.push('talking_points');
    if (modules.meeting_request) flow.push('meeting_request');
  } else if (masterKey === 'hybrid_neutral') {
    // Hybrid: personal_hook → article → inquiry → top_opp → platforms/addons → close
    if (modules.article_recommendations) flow.push('article');
    if (hasInquiry) flow.push('inquiry');
    if (modules.top_opportunities) flow.push('top_opportunities');
    if (modules.platforms) flow.push('platforms');
    if (modules.addons) flow.push('addons');
    if (modules.meeting_request) flow.push('meeting_request');
  } else if (masterKey === 'business_development') {
    // BD: personal_hook → article → top_opp → inquiry → platforms → addons → org_update → close
    if (modules.article_recommendations) flow.push('article');
    if (modules.top_opportunities) flow.push('top_opportunities');
    if (hasInquiry) flow.push('inquiry');
    if (modules.platforms) flow.push('platforms');
    if (modules.addons) flow.push('addons');
    if (modules.general_org_update) flow.push('org_update');
    if (modules.attachments) flow.push('attachments');
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