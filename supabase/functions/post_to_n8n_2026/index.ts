import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing authorization header');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Invalid authentication');
  return { user, supabase };
}

const N8N_WEBHOOK_URL = 'https://inverisllc.app.n8n.cloud/webhook/2026 Pipeline';

/**
 * Build the 2026 pipeline payload from EnhancedDraftPayload.
 * Matches the shape of email_pipeline_contacts_v that the Auto Email Builder expects.
 */
function build2026PipelinePayload(enhanced: any): any {
  const contact = enhanced.contact || {};
  const focusAreasObj = enhanced.focusAreas || {};
  const focusAreas = focusAreasObj.list || [];
  const faDescriptions = focusAreasObj.descriptions || [];
  const opportunities = enhanced.opportunities?.active_tier1 || enhanced.opportunities?.top || [];
  const cc = enhanced.cc || {};
  const content = enhanced.content || {};
  const routing = enhanced.routing || {};
  const groupMembers = enhanced.groupMembers;

  // Entity key
  const isGroup = !!contact.groupContact;
  const entityKey = isGroup
    ? `G:${contact.groupContact}`
    : `I:${contact.id || ''}`;

  // Focus area blocks (exclude Facility Services, map Food Manufacturing -> F&B)
  const focusAreaBlocks = faDescriptions
    .filter((fa: any) => {
      const name = fa.focusArea || fa.focus_area || '';
      return name !== 'Facility Services';
    })
    .map((fa: any) => {
      const name = fa.focusArea || fa.focus_area || '';
      const isAddon = (fa.platformType || fa.platform_type || '').toLowerCase().includes('add-on');
      return {
        focus_area: name,
        focus_area_display: name === 'Food Manufacturing' ? 'F&B' : name,
        has_addons: isAddon,
        add_on_platforms: '',
        add_on_description: '',
        new_platform_description: fa.description || '',
      };
    });

  // Cadence fields
  const daysSince = routing.daysSinceContact || 0;
  const deltaDays = 90;
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

  // Opportunities
  const hasTier12Active = opportunities.length > 0;
  const tier12ActiveList = opportunities
    .map((o: any) => o.dealName || o.deal_name)
    .filter(Boolean)
    .join(', ');

  // CC/BCC
  const ccFinal = cc.final || [];
  const ccEmails = Array.isArray(ccFinal) ? ccFinal.join('; ') : (ccFinal || '');

  // Primary TO email
  const primaryToEmail = groupMembers?.to?.length
    ? groupMembers.to[0].email
    : (contact.email || '');

  return {
    // Core contact fields matching email_pipeline_contacts_v
    entity_key: entityKey,
    is_group: isGroup,
    group_contact: contact.groupContact || null,
    to_contact_id: contact.id || '',
    first_name: contact.firstName || '',
    full_name: contact.fullName || '',
    to_emails: primaryToEmail,
    organization: contact.organization || '',
    cc_emails: ccEmails,
    bcc_emails: null,

    // Focus areas
    focus_areas_ordered: focusAreas.filter((fa: string) => fa !== 'Facility Services'),
    opening_focus_phrase: '',
    focus_area_blocks: focusAreaBlocks,

    // Cadence
    delta_days: deltaDays,
    effective_last_contact_date: effectiveLastContactDate,
    next_due_date: nextDueDate,
    days_until_due: daysUntilDue,
    is_overdue: isOverdue,
    overdue_days: overdueDays,

    // Opportunities
    tier12_active_count: String(opportunities.length),
    has_tier12_active_opps: hasTier12Active,
    tier12_active_list: tier12ActiveList,

    // Supplementary content from email modules
    module_content: {
      greeting: content.greeting || null,
      phrases: content.phrases || {},
      inquiry: content.inquiry || null,
      signature: content.signature || '',
    },

    // Focus area language override (if toggled on)
    focus_area_language: enhanced.focusAreaLanguage || null,

    // Metadata
    meta: {
      source: 'lovable_email_builder',
      draft_mode: '2026_pipeline',
      output_format: 'html',
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user } = await verifyAuth(req);
    console.log(`Authenticated user: ${user.id}`);

    const { payload } = await req.json();
    console.log('Building 2026 pipeline payload for:', payload?.contact?.fullName);

    const pipelinePayload = build2026PipelinePayload(payload);
    console.log('Pipeline payload built:', JSON.stringify(pipelinePayload, null, 2));

    // POST to 2026 Pipeline webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pipelinePayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n 2026 webhook error:', response.status, errorText);
      throw new Error(`n8n 2026 webhook failed: ${response.status} - ${errorText}`);
    }

    // The 2026 Pipeline webhook responds immediately (async processing)
    const responseText = await response.text();
    console.log('n8n 2026 response:', responseText);

    return new Response(
      JSON.stringify({ ok: true, message: 'Draft queued in Outlook' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('post_to_n8n_2026 error:', error);

    if (error.message?.includes('authorization') || error.message?.includes('authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
