import { supabase } from '@/integrations/supabase/client';

/**
 * Valid n8n endpoint keys that map to server-side environment variables.
 * These keys are sent via the x-n8n-endpoint header to the n8n_proxy edge function.
 */
export type N8nEndpoint =
  | 'draft-email'
  | 'email-builder'
  | 'agent-tasks'
  | 'todo-contacts'
  | 'voice-transcription'
  | 'todo'
  | 'email-draft'
  | 'sql-agent'
  | 'opportunities-email'
  | 'group-contact';

/**
 * Calls an n8n webhook through the authenticated Supabase edge function proxy.
 * This replaces all direct frontend-to-n8n fetch calls.
 *
 * @param endpoint - The logical endpoint key (e.g., 'email-builder')
 * @param payload - The JSON payload to send
 * @returns The parsed JSON response from n8n
 */
export async function callN8nProxy<T = any>(
  endpoint: N8nEndpoint,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = (supabase as any).supabaseUrl
    || import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/n8n_proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'x-n8n-endpoint': endpoint,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n proxy error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Calls an n8n webhook with FormData (e.g., for file uploads like voice transcription).
 *
 * @param endpoint - The logical endpoint key
 * @param formData - The FormData to send
 * @returns The parsed JSON response from n8n
 */
export async function callN8nProxyFormData<T = any>(
  endpoint: N8nEndpoint,
  formData: FormData,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = (supabase as any).supabaseUrl
    || import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/n8n_proxy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'x-n8n-endpoint': endpoint,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n proxy error (${response.status}): ${errorText}`);
  }

  return response.json();
}
