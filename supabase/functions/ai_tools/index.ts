import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, model = 'gpt-4o-mini', output = 'json' } = await req.json();

    console.log('AI Tools request:', { message, model, output });

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create system prompt based on output format
    let systemPrompt = `You are a helpful AI assistant that can analyze data and answer questions about contacts, interactions, and opportunities in a CRM system.`;
    
    if (output === 'json') {
      systemPrompt += ` Always respond with valid JSON. For data queries, return {"result": "your answer", "data": [array of relevant data if applicable]}.`;
    } else if (output === 'table') {
      systemPrompt += ` When returning data, format it as a structured table with clear headers and rows. Return JSON with {"rows": [array of objects with consistent keys]}.`;
    } else if (output === 'csv') {
      systemPrompt += ` When returning data, format it as CSV with headers. Return JSON with {"csv": "header1,header2\\nrow1col1,row1col2\\n..."}.`;
    }

    // Determine max_completion_tokens vs max_tokens based on model
    const isNewModel = model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4');
    
    const requestBody: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
    };

    // Use appropriate token parameter based on model
    if (isNewModel) {
      requestBody.max_completion_tokens = 2000;
      // Note: temperature is not supported in newer models
    } else {
      requestBody.max_tokens = 2000;
      requestBody.temperature = 0.7;
    }

    console.log('Calling OpenAI with:', { model, isNewModel });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const aiResponse = data.choices[0].message.content;

    // Try to parse as JSON first
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch {
      // If not JSON, wrap in a response object
      parsedResponse = {
        text: aiResponse,
        format: 'text'
      };
    }

    // Add metadata about the response format
    if (parsedResponse.rows && Array.isArray(parsedResponse.rows)) {
      parsedResponse.format = 'table';
    } else if (parsedResponse.csv) {
      parsedResponse.format = 'csv';
    } else if (parsedResponse.rendered) {
      parsedResponse.format = 'rendered';
    } else if (!parsedResponse.format) {
      parsedResponse.format = 'json';
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai_tools function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      format: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});