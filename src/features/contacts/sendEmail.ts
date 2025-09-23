import { supabase } from '@/integrations/supabase/client';

const N8N_URL = 'https://inverisllc.app.n8n.cloud/webhook/Get-Contacts';

export async function sendContactEmail(contactId: string) {
  // 1) fetch row from contacts_raw
  const { data, error } = await supabase
    .from('contacts_raw')
    .select('*')
    .eq('id', contactId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Contact not found');

  // 2) build payload (include everything + explicit id alias)
  const payload = {
    contact_id: data.id,
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