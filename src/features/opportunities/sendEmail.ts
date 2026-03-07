import { supabase } from '@/integrations/supabase/client';
import { callN8nProxy } from '@/lib/n8nProxy';

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

  // 3) POST to n8n via authenticated proxy
  return callN8nProxy('opportunities-email', payload);
}
