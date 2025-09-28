/**
 * Build canonical Email Builder payload for n8n webhook
 */

import type { ContactEmailComposer } from "@/types/emailComposer";
import type { ModuleStates } from "@/components/email-builder/ModulesCard";
import type { Article } from "@/types/emailComposer";
import { routeCase, routeMaster, type MasterTemplate } from "./router";

export type DraftPayload = {
  contact: {
    email: string;
    fullName: string;
    firstName: string;
    organization: string;
    lgEmailsCc?: string;
  };
  focus: {
    gb_present: boolean;
    fa_count: number;
    focusAreas: string[];
    faDescriptions: {
      focus_area: string;
      platform_type: string | null;
      sector: string | null;
      description: string | null;
    }[];
    sectors: string[];
    hs_present: boolean;
    ls_present: boolean;
  };
  team: {
    leadEmails: string[];
    assistantNames: string[];
    assistantEmails: string[];
  };
  opportunities: {
    has_opps: boolean;
    list: { deal_name: string; ebitda_in_ms: number | null }[];
  };
  articles: {
    focus_area: string | null;
    article_link: string;
    last_date_to_use: string | null;
  }[];
  timing: {
    mostRecentContact: string | null;
    outreachDate: string | null;
  };
  routing: {
    case_key: 'case_1' | 'case_2' | 'case_3' | 'case_4' | 'case_5' | 'case_6' | 'case_7' | 'case_8';
    master_key: 'relationship_maintenance' | 'hybrid_neutral' | 'business_development';
    tone: 'casual' | 'hybrid' | 'formal';
    subject_style: 'casual' | 'mixed' | 'formal';
    modules: {
      initial_greeting: boolean;
      self_personalization: boolean;
      top_opportunities: boolean;
      article_recommendations: boolean;
      platforms: boolean;
      addons: boolean;
      suggested_talking_points: boolean;
      general_org_update: boolean;
      attachments: boolean;
      meeting_request: boolean;
      ai_backup_personalization: boolean;
    };
    flow: string[];
  };
  custom: {
    deltaType: 'Email' | 'Meeting';
    subjectMode: 'lg_first' | 'fa_first';
    maxOpps: number;
    extraCC?: string;
    chosenArticle?: string | null;
    customInstructions?: string;
    customInsertion?: 'before_closing' | 'after_opening' | 'none';
    userSignatureName: 'Tom Luce';
  };
};

interface UIState {
  deltaType: 'Email' | 'Meeting';
  moduleStates: ModuleStates;
  selectedArticle?: Article | null;
  masterTemplate?: MasterTemplate | null;
}

/**
 * Generate flow array based on master template and enabled modules
 */
function generateFlow(masterKey: string, modules: ModuleStates): string[] {
  const flow: string[] = [];

  // Always start with greeting if enabled
  if (modules.initial_greeting) {
    flow.push('greeting');
  }

  // Personalization comes early in all templates
  if (modules.self_personalization) {
    flow.push('personalization');
  }

  // Template-specific ordering
  if (masterKey === 'relationship_maintenance') {
    // Relationship: greeting → personalization → opportunity → article? → talking_points? → meeting_request
    if (modules.top_opportunities) flow.push('opportunity');
    if (modules.article_recommendations) flow.push('article');
    if (modules.suggested_talking_points) flow.push('talking_points');
    if (modules.meeting_request) flow.push('meeting_request');
  } else if (masterKey === 'hybrid_neutral') {
    // Hybrid: greeting → personalization → article? → opportunity → platforms? → addons? → meeting_request
    if (modules.article_recommendations) flow.push('article');
    if (modules.top_opportunities) flow.push('opportunity');
    if (modules.platforms) flow.push('platforms');
    if (modules.addons) flow.push('addons');
    if (modules.meeting_request) flow.push('meeting_request');
  } else if (masterKey === 'business_development') {
    // BD: greeting → personalization → article → opportunity → platforms → addons → org_update → attachments? → meeting_request
    if (modules.article_recommendations) flow.push('article');
    if (modules.top_opportunities) flow.push('opportunity');
    if (modules.platforms) flow.push('platforms');
    if (modules.addons) flow.push('addons');
    if (modules.general_org_update) flow.push('org_update');
    if (modules.attachments) flow.push('attachments');
    if (modules.meeting_request) flow.push('meeting_request');
  }

  return flow;
}

/**
 * Build the canonical payload for n8n Email-Builder webhook
 */
export function buildDraftPayload(
  contactData: ContactEmailComposer,
  uiState: UIState
): DraftPayload {
  // Get master template (auto-route if not provided)
  const masterTemplate = uiState.masterTemplate || routeMaster(contactData.most_recent_contact);
  
  // Calculate case
  const caseKey = routeCase(contactData.gb_present, contactData.fa_count, contactData.has_opps);
  
  // Sort opportunities by EBITDA (top 3)
  const sortedOpps = [...contactData.opps]
    .sort((a, b) => (b.ebitda_in_ms || 0) - (a.ebitda_in_ms || 0))
    .slice(0, 3);

  // Check for Healthcare sectors
  const sectors = contactData.fa_sectors || [];
  const hs_present = sectors.some(s => s?.toLowerCase().includes('healthcare'));
  const ls_present = sectors.some(s => s?.toLowerCase().includes('life'));

  return {
    contact: {
      email: contactData.email,
      fullName: contactData.full_name,
      firstName: contactData.first_name,
      organization: contactData.organization || '',
      lgEmailsCc: contactData.lg_emails_cc || undefined,
    },
    focus: {
      gb_present: contactData.gb_present,
      fa_count: contactData.fa_count,
      focusAreas: contactData.focus_areas,
      faDescriptions: contactData.fa_descriptions.map(desc => ({
        focus_area: desc.focus_area,
        platform_type: desc.platform_type || null,
        sector: desc.sector || null,
        description: desc.description || null,
      })),
      sectors: sectors,
      hs_present,
      ls_present,
    },
    team: {
      leadEmails: contactData.lead_emails || [],
      assistantNames: contactData.assistant_names || [],
      assistantEmails: contactData.assistant_emails || [],
    },
    opportunities: {
      has_opps: contactData.has_opps,
      list: sortedOpps.map(opp => ({
        deal_name: opp.deal_name,
        ebitda_in_ms: opp.ebitda_in_ms,
      })),
    },
    articles: contactData.articles.map(article => ({
      focus_area: article.focus_area || null,
      article_link: article.article_link,
      last_date_to_use: article.last_date_to_use || null,
    })),
    timing: {
      mostRecentContact: contactData.most_recent_contact || null,
      outreachDate: contactData.outreach_date || null,
    },
    routing: {
      case_key: caseKey as any,
      master_key: masterTemplate.master_key,
      tone: masterTemplate.tone,
      subject_style: masterTemplate.subject_style,
      modules: uiState.moduleStates,
      flow: generateFlow(masterTemplate.master_key, uiState.moduleStates),
    },
    custom: {
      deltaType: uiState.deltaType,
      subjectMode: 'lg_first', // Default for now
      maxOpps: 3,
      chosenArticle: uiState.selectedArticle?.article_link || null,
      customInsertion: 'before_closing',
      userSignatureName: 'Tom Luce',
    },
  };
}