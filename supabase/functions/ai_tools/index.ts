import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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
      systemPrompt += `

CRITICAL: Always return your response as a JSON object with this exact structure:
{
  "result": "Brief summary or explanation of findings",
  "data": [array of objects where each object represents a row with consistent column names]
}

Rules:
- "result" field should contain a human-readable summary or answer
- "data" field must be an array of objects (even if empty)
- Each object in "data" must have the same keys (column names)
- Use clear, descriptive column names
- Always include both "result" and "data" fields

Example for contact query:
{
  "result": "Found 5 contacts who need follow-up within the next week",
  "data": [
    {"name": "John Doe", "company": "Acme Corp", "days_since_contact": 45, "email": "john@acme.com"},
    {"name": "Jane Smith", "company": "TechCo", "days_since_contact": 30, "email": "jane@techco.com"}
  ]
}

Example for analytics query:
{
  "result": "Total revenue is $1.5M across 12 opportunities",
  "data": [
    {"metric": "Total Opportunities", "value": 12},
    {"metric": "Total Revenue", "value": "$1.5M"},
    {"metric": "Average Deal Size", "value": "$125K"}
  ]
}`;
    } else if (output === 'csv') {
      systemPrompt += ` When returning data, format it as CSV with headers. Return JSON with {"csv": "header1,header2\\nrow1col1,row1col2\\n..."}.`;
    }

    // Use Lovable AI Gateway with Gemini (FREE until Oct 6, 2025!)
    const aiModel = model.startsWith('google/') ? model : 'google/gemini-2.5-flash';
    
    const requestBody = {
      model: aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    };

    console.log('Calling Lovable AI with:', { model: aiModel });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Lovable AI Error:', response.status, errorData);
      
      // Handle rate limit errors
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (response.status === 402) {
        throw new Error('AI credits depleted. Please add credits to your workspace.');
      }
      
      throw new Error(`AI Gateway error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    const aiResponse = data.choices[0].message.content;

    // Try to parse as JSON first
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
      
      // Normalize the response structure for consistent frontend handling
      if (output === 'table') {
        // If AI used different field names, normalize them
        const normalized: any = {};
        
        // Extract text content from various possible field names
        const textFields = ['result', 'message', 'summary', 'text', 'answer', 'response'];
        const textContent = textFields.map(f => parsedResponse[f]).filter(Boolean).join('\n\n');
        if (textContent) {
          normalized.result = textContent;
        }
        
        // Extract array data and normalize to 'data' field
        const arrayFields = ['data', 'rows', 'results', 'contacts', 'opportunities', 'items', 'records'];
        const arrayField = arrayFields.find(f => Array.isArray(parsedResponse[f]) && parsedResponse[f].length > 0);
        if (arrayField) {
          normalized.data = parsedResponse[arrayField];
          // Also keep 'rows' for backward compatibility
          normalized.rows = parsedResponse[arrayField];
        }
        
        // Merge normalized fields back into parsed response
        parsedResponse = { ...parsedResponse, ...normalized };
      }
    } catch {
      // If not JSON, wrap in a response object
      parsedResponse = {
        text: aiResponse,
        format: 'text'
      };
    }

    // Add metadata about the response format
    if ((parsedResponse.rows || parsedResponse.data) && Array.isArray(parsedResponse.rows || parsedResponse.data)) {
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