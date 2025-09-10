import { supabase } from '@/integrations/supabase/client';

const N8N_URL = 'https://inverisllc.app.n8n.cloud/webhook/Opportunities-Email';

export async function sendOpportunityEmail(opportunityId: string) {
  // 1) fetch row from opportunities_raw (since opportunities_email_payload view may not exist yet)
  const { data, error } = await supabase
    .from('opportunities_raw')
    .select('*')
    .eq('id', opportunityId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Opportunity not found');

  // 2) build payload (include everything + explicit id alias)
  const payload = {
    opportunity_id: data.id,
    ...data,
  };

  // 3) POST to n8n webhook
  const res = await fetch(N8N_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Webhook failed (${res.status}): ${txt || res.statusText}`);
  }

  return res;
}