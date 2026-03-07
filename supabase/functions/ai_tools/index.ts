import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
import { buildCorsHeaders } from "../_shared/cors.ts";


// Simple in-memory rate limiting (per user per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  // Clean up expired entries
  if (userLimit && userLimit.resetAt < now) {
    rateLimitMap.delete(userId);
  }

  const current = rateLimitMap.get(userId);
  
  if (!current) {
    // First request in window
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + RATE_WINDOW };
  }

  if (current.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  // Increment count
  current.count++;
  rateLimitMap.set(userId, current);
  return { allowed: true, remaining: RATE_LIMIT - current.count, resetAt: current.resetAt };
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract user ID from auth header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let userId = 'anonymous';

    if (token) {
      // Create Supabase client to verify token and get user
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter 
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          'Retry-After': retryAfter.toString(),
        },
      });
    }
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

    // Try to parse as JSON - strip markdown code fences first
    let cleanResponse = aiResponse.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(cleanResponse);
    } catch {
      parsedResponse = null;
    }

    // Normalize response structure - ALWAYS extract text and data fields
    let normalized: any = {};
    
    if (parsedResponse) {
      // Extract text fields (result, summary, text, etc.)
      const textFields = ['result', 'summary', 'text', 'message', 'answer', 'response'];
      const textContent = textFields.map(f => parsedResponse[f]).filter(Boolean).join('\n\n');
      if (textContent) {
        normalized.result = textContent;
        normalized.summary = textContent;
        normalized.text = textContent;
      }
      
      // Extract array data and normalize to both 'data' and 'rows' fields
      const arrayFields = ['data', 'rows', 'results', 'items', 'contacts', 'opportunities', 'records'];
      for (const field of arrayFields) {
        if (Array.isArray(parsedResponse[field]) && parsedResponse[field].length > 0) {
          normalized.data = parsedResponse[field];
          normalized.rows = parsedResponse[field];
          break;
        }
      }
      
      // If the entire response is an array, use it
      if (Array.isArray(parsedResponse)) {
        normalized.data = parsedResponse;
        normalized.rows = parsedResponse;
      }
      
      // Merge normalized fields with original
      parsedResponse = { ...parsedResponse, ...normalized };
    } else {
      // Not JSON, return as plain text
      parsedResponse = { text: aiResponse, result: aiResponse };
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
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': RATE_LIMIT.toString(),
        'X-RateLimit-Remaining': checkRateLimit(userId).remaining.toString(),
        'X-RateLimit-Reset': checkRateLimit(userId).resetAt.toString(),
      },
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