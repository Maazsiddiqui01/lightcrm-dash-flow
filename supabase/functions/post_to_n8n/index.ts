import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = 'https://inverisllc.app.n8n.cloud/webhook/Email-Builder';

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
  const ccFinal = cc.final || uniqueEmails([
    ...leadCC,
    ...(routing.deltaType === 'Meeting' ? assistantCC : []),
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

  const assistantClause = (routing.deltaType === 'Meeting' && assistantNames.length)
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

  // Build n8n payload
  return {
    contact: {
      email: contact.email,
      fullName: contact.fullName || contact.full_name,
      firstName: contact.firstName || contact.first_name,
      organization: contact.organization || '',
    },
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
      modules: modules,
      flow: enhanced.flow || [],
    },
    custom: {
      deltaType: 'Email',
      subjectMode: 'lg_first',
      maxOpps: 3,
      chosenArticle: articlesObj.selected || articles[0]?.link || null,
      customInsertion: 'before_closing',
      userSignatureName: content.signature || 'Tom Luce',
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
      articleChosen: articlesObj.selected || articles[0]?.link || null,
      insertArticleAfterGreeting: !!articles[0],
      assistantClause: content.assistantClause || assistantClause,
      caseHuman: caseLabels['case_7'] || 'case_7',
      sectorsUnique,
    },
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payload } = await req.json();
    console.log('Received EnhancedDraftPayload:', JSON.stringify(payload, null, 2));

    // Transform to n8n format
    const n8nPayload = transformToN8NPayload(payload);
    console.log('Transformed to n8n format:', JSON.stringify(n8nPayload, null, 2));

    // POST to n8n webhook and stream the response
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
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
