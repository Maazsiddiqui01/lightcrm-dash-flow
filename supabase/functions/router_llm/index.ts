import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { buildCorsHeaders } from "../_shared/cors.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');


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

const systemPrompt = `You are a deterministic router for LG Outreach. 
Input describes a contact's scenario. Decide which of 8 cases applies and return JSON ONLY:
{
  "case_id": 1|2|3|4|5|6|7|8,
  "reason": "short human explanation",
  "variables": {
    "gb_present": boolean,
    "fa_count": 1|2|3,
    "has_opps": boolean,
    "delta_type": "Email"|"Meeting",
    "hs_present": boolean,
    "ls_present": boolean,
    "ebitda_mode": "30m"|"35m"|"30-35m",
    "summary_sector_list": string[]
  }
}
Case map:
1: GB + 1FA + noOpps
2: GB + ≥3FAs + noOpps
3: NoGB + 1FA + noOpps
4: NoGB + ≥2FAs + noOpps
5: GB + (1–2)FAs + hasOpps
6: GB + ≥3FAs + hasOpps
7: NoGB + (1–2)FAs + hasOpps
8: NoGB + ≥3FAs + hasOpps
EBITDA mode:
- HS/LS only → "30m"
- non-HS/LS only → "35m"
- mix → "30-35m"
Respond with JSON only; no prose.`;

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user } = await verifyAuth(req);
    console.log(`Authenticated user: ${user.id}`);

    const requestData = await req.json();
    
    console.log('RouterLLM request:', requestData);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(requestData) }
        ],
        max_tokens: 500,
        temperature: 0.1, // Low temperature for deterministic routing
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    
    console.log('RouterLLM raw response:', result);

    // Parse the JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse RouterLLM response:', result);
      throw new Error('Invalid JSON response from RouterLLM');
    }

    console.log('RouterLLM parsed result:', parsedResult);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in router_llm function:', error);
    
    // Return 401 for authentication errors
    if (error.message?.includes('authorization') || error.message?.includes('authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});