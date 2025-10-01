/**
 * Build canonical Email Builder payload for n8n webhook
 * Includes all computed helpers for n8n processing
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
  helpers: {
    ccFinal: string[];
    ccFinalString: string;
    descByFA: Record<string, string>;
    platformFAs: string[];
    addonFAs: string[];
    ebitdaMode: '30m' | '35m' | '30to35m';
    mrcBucket: string;
    mrcMonth: string;
    oppsFlat: string;
    subjectComputed: string;
    blackout: { blocked: boolean; reason: string };
    articleChosen: string | null;
    insertArticleAfterGreeting: boolean;
    assistantClause: string;
    caseHuman: string;
    sectorsUnique: string[];
  };
};

interface UIState {
  deltaType: 'Email' | 'Meeting';
  moduleStates: {
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
  selectedArticle?: Article | null;
  masterTemplate?: MasterTemplate | null;
}

/**
 * Generate flow array based on master template and enabled modules
 */
function generateFlow(masterKey: string, modules: {
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
}): string[] {
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

// Helper functions for computed fields
const uniqueEmails = (arr: (string | null | undefined)[]) =>
  Array.from(
    new Set(
      (arr || [])
        .filter(Boolean)
        .map(x => String(x).trim())
        .filter(x => /\S+@\S+\.\S+/.test(x))
        .map(x => x.toLowerCase())
    )
  );

const joinOxford = (arr: string[]) => {
  const a = (arr || []).filter(Boolean).map(s => s.trim());
  if (a.length <= 1) return a.join('');
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

const cleanText = (s?: string) =>
  (s || '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const computeEbitdaMode = (hsPresent: boolean, lsPresent: boolean, hasOther: boolean): '30m' | '35m' | '30to35m' => {
  if ((hsPresent || lsPresent) && hasOther) return '30to35m';
  if (hsPresent || lsPresent) return '30m';
  return '35m';
};

const bucketMRC = (iso?: string) => {
  if (!iso) return { bucket: 'a few months', month: '' };
  const d = new Date(iso);
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  let bucket = 'a few months';
  if (diffDays <= 14) bucket = 'a few weeks';
  else if (diffDays <= 60) bucket = 'a month';
  else if (diffDays <= 90) bucket = 'a couple of months';
  else if (diffDays <= 110) bucket = 'about three months';
  const month = d.toLocaleString('en-US', { month: 'long' });
  return { bucket, month };
};

const computeBlackout = (iso?: string) => {
  const dt = iso ? new Date(iso) : new Date();
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  const day = dt.getUTCDay();

  const isRange = (start: string, end: string) => {
    const s = new Date(start), e = new Date(end);
    return dt >= s && dt <= e;
  };

  let blocked = false, reason = '';

  // Weekend
  if (day === 0 || day === 6) { blocked = true; reason = 'Weekend blackout'; }

  // July 2–6
  if (!blocked && isRange(`${y}-07-02T00:00:00Z`, `${y}-07-06T23:59:59Z`)) {
    blocked = true; reason = 'July 2–6 blackout';
  }

  // Dec 20 – Jan 5
  if (!blocked && (isRange(`${y}-12-20T00:00:00Z`, `${y}-12-31T23:59:59Z`) ||
                   isRange(`${y}-01-01T00:00:00Z`, `${y}-01-05T23:59:59Z`))) {
    blocked = true; reason = 'Holiday blackout (Dec 20–Jan 5)';
  }

  // Nov 11
  if (!blocked && m === 11 && d === 11) { blocked = true; reason = 'Nov 11 blackout'; }

  // Thanksgiving week
  if (!blocked && m === 11) {
    const firstNov = new Date(Date.UTC(y, 10, 1));
    const firstTueOffset = (9 - firstNov.getUTCDay()) % 7;
    const fourthTue = new Date(Date.UTC(y, 10, 1 + firstTueOffset + 21));
    const nextTue = new Date(Date.UTC(y, 10, fourthTue.getUTCDate() + 7));
    if (dt >= fourthTue && dt <= nextTue) {
      blocked = true; reason = 'Thanksgiving blackout';
    }
  }

  return { blocked, reason };
};

const computeSubject = (focusAreas: string[], org: string) => {
  if (!focusAreas?.length) return `LG / ${org || 'Organization'}`;
  const normalized = focusAreas.map(f => f.replace(/\s+/g, ' ').trim());
  if (normalized.length === 2 &&
      normalized.some(f => /^healthcare services/i.test(f)) &&
      normalized.some(f => /^life sciences/i.test(f))) {
    return `Healthcare Services/Life Sciences: LG / ${org || 'Organization'}`;
  }
  if (normalized.length === 1) {
    return `${normalized[0]}: LG / ${org || 'Organization'}`;
  }
  return `${normalized[0]} & ${normalized[1]}: LG / ${org || 'Organization'}`;
};

/**
 * Build the canonical payload for n8n Email-Builder webhook
 * Includes ALL computed helpers
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

  const focusAreas = contactData.focus_areas;
  const faDescriptions = contactData.fa_descriptions;

  // Compute helpers
  const baseCC = uniqueEmails((contactData.lg_emails_cc || '').split(/[;,]/g));
  const leadCC = uniqueEmails(contactData.lead_emails || []);
  const assistantCC = uniqueEmails(contactData.assistant_emails || []);
  const ccFinal = uniqueEmails([
    ...baseCC,
    ...leadCC,
    ...(uiState.deltaType === 'Meeting' ? assistantCC : []),
  ]).filter(e => e !== contactData.email.toLowerCase());

  const descByFA: Record<string, string> = {};
  faDescriptions.forEach(r => {
    if (r?.focus_area) descByFA[r.focus_area] = cleanText(r.description);
  });

  const platformFAs = faDescriptions
    .filter(r => /new platform/i.test(r.platform_type || ''))
    .map(r => r.focus_area);
  
  const addonFAs = faDescriptions
    .filter(r => /add-?on/i.test(r.platform_type || ''))
    .map(r => r.focus_area);

  const hasOther = focusAreas.some(fa =>
    !/^healthcare services/i.test(fa) && !/^life sciences/i.test(fa)
  );
  const ebitdaMode = computeEbitdaMode(hs_present, ls_present, hasOther);

  const { bucket: mrcBucket, month: mrcMonth } = bucketMRC(contactData.most_recent_contact);

  const oppNames = sortedOpps.slice(0, 3).map(o => o.deal_name).filter(Boolean);
  const oppsFlat = joinOxford(oppNames);

  const subjectComputed = computeSubject(focusAreas, contactData.organization || '');

  const blackout = computeBlackout(contactData.outreach_date);

  const articleChosen = uiState.selectedArticle?.article_link || null;
  const insertArticleAfterGreeting = !!articleChosen;

  const assistantClause = (uiState.deltaType === 'Meeting' && (contactData.assistant_names || []).length)
    ? `${joinOxford(contactData.assistant_names)}, copied here, can assist with scheduling on our end.`
    : '';

  const sectorsUnique = Array.from(new Set(sectors.map(s => String(s).toLowerCase())));

  const caseLabels: Record<string, string> = {
    case_1: 'Case 1 — GB Only',
    case_2: 'Case 2 — GB + (1–2) FAs — No Opps',
    case_3: 'Case 3 — GB + (1–2) FAs — Has Opps',
    case_4: 'Case 4 — GB + (3+) FAs — No Opps',
    case_5: 'Case 5 — GB + (3+) FAs — Has Opps',
    case_6: 'Case 6 — No GB — (1–2) FAs — No Opps',
    case_7: 'Case 7 — No GB — (1–2) FAs — Has Opps',
    case_8: 'Case 8 — No GB — (3+) FAs',
  };

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
      focusAreas,
      faDescriptions: faDescriptions.map(desc => ({
        focus_area: desc.focus_area,
        platform_type: desc.platform_type || null,
        sector: desc.sector || null,
        description: desc.description || null,
      })),
      sectors,
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
      subjectMode: 'lg_first',
      maxOpps: 3,
      chosenArticle: articleChosen,
      customInsertion: 'before_closing',
      userSignatureName: 'Tom Luce',
    },
    helpers: {
      ccFinal,
      ccFinalString: ccFinal.join('; '),
      descByFA,
      platformFAs,
      addonFAs,
      ebitdaMode,
      mrcBucket,
      mrcMonth,
      oppsFlat,
      subjectComputed,
      blackout,
      articleChosen,
      insertArticleAfterGreeting,
      assistantClause,
      caseHuman: caseLabels[caseKey] || caseKey,
      sectorsUnique,
    },
  };
}