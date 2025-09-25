import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are LG-Outreach-Preview. 
Return a SHORT sample email BODY ONLY (no JSON, no subject, no CC). 
Rules:
- If 1 focus area -> paragraph only; if 2 -> bullets; if ≥3 -> bullets.
- Use HS wording override verbatim: 
  "In Healthcare Services, we're focused on businesses that serve hospitals and health systems as key end markets."
- Ask line thresholds:
  HS/LS only -> ">$30m EBITDA"
  non-HS/LS only -> ">$35m EBITDA"
  mix -> ">$30–35m EBITDA"
- Respect Email vs Meeting closing (for Meeting, include a sample assistant name).
- End with:
  Best,
  Tom
- Keep it 3–4 short paragraphs; US spelling; no HTML entities.
Return the body text only.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    console.log('TemplatePreviewLLM request:', requestData);

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
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    
    console.log('TemplatePreviewLLM response:', result);

    return new Response(result, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Error in template_preview_llm function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});