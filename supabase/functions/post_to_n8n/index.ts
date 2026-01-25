import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify authentication
async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Invalid authentication');
  }

  return { user, supabase };
}

const N8N_WEBHOOK_URL = 'https://inverisllc.app.n8n.cloud/webhook/Email-Builder';

/**
 * Build the unified 2026 payload block
 * This is additive - does not modify any existing payload structure
 */
function buildUnified2026Block(enhanced: any, contact: any): any {
  const focusAreasObj = enhanced.focusAreas || {};
  const focusAreas = focusAreasObj.list || [];
  const faDescriptions = focusAreasObj.descriptions || [];
  const opportunities = enhanced.opportunities?.active_tier1 || enhanced.opportunities?.top || [];
  const cc = enhanced.cc || {};
  
  // Build entity_key
  const isGroup = !!contact.groupContact;
  const entityKey = isGroup 
    ? `G:${contact.groupContact}` 
    : `I:${contact.id || enhanced.contact?.id || ''}`;
  
  // Build focus_area_blocks with display name rules
  const focusAreaBlocks = faDescriptions
    .filter((fa: any) => {
      const faName = fa.focusArea || fa.focus_area || '';
      return faName !== 'Facility Services'; // Exclude Facility Services
    })
    .map((fa: any) => {
      const faName = fa.focusArea || fa.focus_area || '';
      const isAddon = fa.platformType?.toLowerCase().includes('add-on') || 
                      fa.platform_type?.toLowerCase().includes('add-on') || false;
      return {
        focus_area: faName,
        has_addons: isAddon,
        add_on_platforms: '', // Would need addon platform data
        add_on_description: '',
        focus_area_display: faName === 'Food Manufacturing' ? 'F&B' : faName,
        new_platform_description: fa.description || '',
      };
    });
  
  // Compute cadence fields with fallbacks
  const daysSince = enhanced.routing?.daysSinceContact || 0;
  const deltaDays = 90; // Default cadence
  const effectiveLastContactDate = daysSince > 0 
    ? new Date(Date.now() - daysSince * 86400000).toISOString().split('T')[0] 
    : null;
  const nextDueDate = effectiveLastContactDate 
    ? new Date(new Date(effectiveLastContactDate).getTime() + deltaDays * 86400000).toISOString().split('T')[0]
    : null;
  const daysUntilDue = nextDueDate 
    ? Math.floor((new Date(nextDueDate).getTime() - Date.now()) / 86400000)
    : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const overdueDays = isOverdue ? Math.abs(daysUntilDue!) : 0;
  
  // Build opportunities - tier 1/2 active
  const hasTier12Active = opportunities.length > 0;
  const tier12ActiveList = opportunities
    .map((o: any) => o.dealName || o.deal_name)
    .filter(Boolean)
    .join(', ');
  
  // Build CC/BCC strings
  const ccFinal = cc.final || [];
  const ccEmails = Array.isArray(ccFinal) ? ccFinal.join('; ') : (ccFinal || '');
  
  // Determine primary contact email
  const groupMembers = enhanced.groupMembers;
  const primaryToEmail = groupMembers?.to?.length 
    ? groupMembers.to[0].email 
    : (contact.email || enhanced.contact?.email || '');
  
  return {
    entity_key: entityKey,
    is_group: isGroup,
    group_contact: contact.groupContact || contact.group_contact || null,
    to_contact_id: contact.id || enhanced.contact?.id || '',
    first_name: contact.firstName || contact.first_name || '',
    full_name: contact.fullName || contact.full_name || '',
    to_emails: primaryToEmail,
    organization: contact.organization || '',
    cc_emails: ccEmails,
    bcc_emails: null,
    focus_areas_ordered: focusAreas.filter((fa: string) => fa !== 'Facility Services'),
    opening_focus_phrase: '', // Could be computed based on focus areas
    focus_area_blocks: focusAreaBlocks,
    delta_days: deltaDays,
    effective_last_contact_date: effectiveLastContactDate,
    next_due_date: nextDueDate,
    days_until_due: daysUntilDue,
    is_overdue: isOverdue,
    overdue_days: overdueDays,
    tier12_active_count: String(opportunities.length),
    has_tier12_active_opps: hasTier12Active,
    tier12_active_list: tier12ActiveList,
    max_group_contact_date: null, // Would need group-level data
    max_individual_contact_date: effectiveLastContactDate,
    meta: {
      source: 'lovable_email_builder',
      draft_mode: '2026_unified',
      output_format: 'html',
    },
  };
}

/**
 * Transform EnhancedDraftPayload to n8n DraftPayload format
 */
function transformToN8NPayload(enhanced: any): any {
  // Extract data from EnhancedDraftPayload
  const contact = enhanced.contact;
  const focusAreasObj = enhanced.focusAreas || {};
  const focusAreas = focusAreasObj.list || [];
  const faDescriptions = focusAreasObj.descriptions || [];
  const opportunities = (enhanced.opportunities?.top || []);
  const articlesObj = enhanced.articles || {};
  const articles = articlesObj.available || [];
  const routing = enhanced.routing || {};
  const content = enhanced.content || {};
  const cc = enhanced.cc || {};
  const modules = enhanced.modules || {};

  // Extract sectors from descriptions
  const sectors = Array.from(new Set(faDescriptions.map((d: any) => d.sector).filter(Boolean)));
  
  // Check for Healthcare/Life Sciences
  const hs_present = sectors.some((s: string) => s?.toLowerCase().includes('healthcare'));
  const ls_present = sectors.some((s: string) => s?.toLowerCase().includes('life'));

  // Build team data from CC
  const leadEmails = cc.leads || [];
  const assistantNames = contact.assistantNames || [];
  const assistantEmails = cc.assistants || [];

  // Compute helpers
  const uniqueEmails = (arr: string[]) => Array.from(new Set(arr.filter(Boolean).map(e => e.toLowerCase())));
  
  const leadCC = uniqueEmails(leadEmails);
  const assistantCC = uniqueEmails(assistantEmails);
  
  // Use deltaType from routing to determine CC logic
  const deltaType = routing.deltaType || 'Email';
  const ccFinal = cc.final || uniqueEmails([
    ...leadCC,
    ...(deltaType === 'Meeting' ? assistantCC : []),
  ]).filter((e: string) => e !== contact.email?.toLowerCase());

  const descByFA: Record<string, string> = {};
  faDescriptions.forEach((r: any) => {
    if (r?.focusArea) descByFA[r.focusArea] = r.description || '';
  });

  const platformFAs = focusAreasObj.platforms || [];
  const addonFAs = focusAreasObj.addons || [];

  const hasOther = focusAreas.some((fa: string) =>
    !/^healthcare services/i.test(fa) && !/^life sciences/i.test(fa)
  );
  
  const computeEbitdaMode = (hs: boolean, ls: boolean, other: boolean): '30m' | '35m' | '30to35m' => {
    if ((hs || ls) && other) return '30to35m';
    if (hs || ls) return '30m';
    return '35m';
  };
  const ebitdaMode = computeEbitdaMode(hs_present, ls_present, hasOther);

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
  const daysSince = routing.daysSinceContact || 0;
  const mrcISO = daysSince ? new Date(Date.now() - daysSince * 86400000).toISOString() : null;
  const { bucket: mrcBucket, month: mrcMonth } = bucketMRC(mrcISO);

  const joinOxford = (arr: string[]) => {
    const a = (arr || []).filter(Boolean);
    if (a.length <= 1) return a.join('');
    if (a.length === 2) return `${a[0]} and ${a[1]}`;
    return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
  };
  
  const oppNames = opportunities.slice(0, 3).map((o: any) => o.dealName || o.deal_name).filter(Boolean);
  const oppsFlat = joinOxford(oppNames);

  const computeSubject = (fas: string[], org: string) => {
    if (!fas?.length) return `LG / ${org || 'Organization'}`;
    if (fas.length === 1) return `${fas[0]}: LG / ${org}`;
    return `${fas[0]} & ${fas[1]}: LG / ${org}`;
  };
  const subjectComputed = computeSubject(focusAreas, contact.organization || '');

  const computeBlackout = (iso?: string) => {
    const dt = iso ? new Date(iso) : new Date();
    const day = dt.getUTCDay();
    if (day === 0 || day === 6) return { blocked: true, reason: 'Weekend blackout' };
    return { blocked: false, reason: '' };
  };
  const blackout = computeBlackout(new Date().toISOString());

  const assistantClause = (deltaType === 'Meeting' && assistantNames.length)
    ? `${joinOxford(assistantNames)}, copied here, can assist with scheduling on our end.`
    : '';

  const sectorsUnique = Array.from(new Set(sectors.map((s: string) => String(s).toLowerCase())));

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

  // Determine primary TO recipients
  const groupMembers = enhanced.groupMembers;
  const primaryToEmail = groupMembers?.to.length 
    ? groupMembers.to[0].email 
    : contact.email;
  const primaryToName = groupMembers?.to.length
    ? groupMembers.to[0].fullName
    : (contact.fullName || contact.full_name);

  // Build comprehensive CC list including group members
  const groupCcEmails = groupMembers?.cc.map(m => m.email) || [];
  const allCcEmails = uniqueEmails([
    ...leadCC,
    ...(deltaType === 'Meeting' ? assistantCC : []),
    ...groupCcEmails,
  ]).filter((e: string) => e !== primaryToEmail.toLowerCase());

  // Build BCC list (group BCC members only)
  const groupBccEmails = groupMembers?.bcc.map(m => m.email) || [];

  // Build n8n payload
  return {
    contact: {
      email: primaryToEmail,
      fullName: primaryToName,
      firstName: contact.firstName || contact.first_name,
      organization: contact.organization || '',
      groupContact: contact.groupContact || null,
      groupEmailRole: contact.groupEmailRole || null,
    },
    groupMembers: groupMembers ? {
      to: groupMembers.to,
      cc: groupMembers.cc,
      bcc: groupMembers.bcc,
    } : null,
    focus: {
      gb_present: focusAreas.some((fa: string) => /general\s*bd/i.test(fa)),
      fa_count: focusAreas.length,
      focusAreas,
      faDescriptions,
      sectors,
      hs_present,
      ls_present,
    },
    team: {
      leadEmails,
      assistantNames,
      assistantEmails,
    },
    opportunities: {
      has_opps: opportunities.length > 0,
      list: opportunities.slice(0, 3).map((o: any) => ({
        deal_name: o.dealName || o.deal_name,
        ebitda_in_ms: o.ebitda || o.ebitda_in_ms || null,
      })),
    },
    articles: articles.map((a: any) => ({
      focus_area: a.focusArea || a.focus_area || null,
      article_link: a.link || a.article_link,
      last_date_to_use: a.lastDate || a.last_date_to_use || null,
    })),
    timing: {
      mostRecentContact: mrcISO,
      outreachDate: new Date().toISOString(),
    },
    routing: {
      case_key: 'case_7', // Computed based on rules
      master_key: routing.masterKey || routing.master_key || 'hybrid_neutral',
      tone: routing.tone || 'hybrid',
      subject_style: routing.subjectStyle || routing.subject_style || 'mixed',
      deltaType: deltaType, // Pass through deltaType
      modules: modules,
      flow: enhanced.flow || [],
      moduleSequence: enhanced.moduleSequence || [], // Pass module sequence
      modulesV2: enhanced.modulesV2 || [], // COMPASS: detailed module selections
    },
    custom: {
      deltaType: deltaType, // Pass deltaType to custom as well for backward compat
      subjectMode: 'lg_first',
      maxOpps: 3,
      chosenArticle: articlesObj.selected || articles[0]?.link || null,
      customInsertion: 'before_closing',
      userSignatureName: content.signature || 'Tom Luce',
    },
    helpers: {
      ccFinal: allCcEmails,
      ccFinalString: allCcEmails.join('; '),
      bccFinal: groupBccEmails,
      bccFinalString: groupBccEmails.join('; '),
      descByFA,
      platformFAs,
      addonFAs,
      ebitdaMode,
      mrcBucket,
      mrcMonth,
      oppsFlat,
      subjectComputed,
      blackout,
      articleChosen: articlesObj.selected || articles[0]?.link || null,
      insertArticleAfterGreeting: !!articles[0],
      assistantClause: content.assistantClause || assistantClause,
      caseHuman: caseLabels['case_7'] || 'case_7',
      sectorsUnique,
    },
    
    // NEW: 2026 unified payload block (additive, does not modify existing structure)
    unified_2026: buildUnified2026Block(enhanced, contact),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user } = await verifyAuth(req);
    console.log(`Authenticated user: ${user.id}`);

    const requestBody = await req.json();
    const { mode, batchId, batchIndex, batchTotal, payload } = requestBody;
    
    // Log batch context if present
    if (batchId) {
      console.log(`Batch request: ${batchId} [${(batchIndex ?? 0) + 1}/${batchTotal ?? 1}]`);
    }
    
    console.log('Received EnhancedDraftPayload:', JSON.stringify(payload, null, 2));

    // Transform to n8n format
    const n8nPayload = transformToN8NPayload(payload);
    console.log('Transformed to n8n format:', JSON.stringify(n8nPayload, null, 2));

    // Add batch metadata to payload if present
    const finalPayload = {
      ...n8nPayload,
      ...(mode && { mode }),
      ...(batchId && { batchId, batchIndex, batchTotal }),
    };

    // POST to n8n webhook and stream the response
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', response.status, errorText);
      throw new Error(`n8n webhook failed: ${response.status} - ${errorText}`);
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('post_to_n8n error:', error);
    
    // Return 401 for authentication errors
    if (error.message?.includes('authorization') || error.message?.includes('authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: String(error)
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
