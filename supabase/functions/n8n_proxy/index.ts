import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

// Map of allowed endpoint keys to environment variable names
const ENDPOINT_MAP: Record<string, string> = {
  "draft-email": "N8N_WEBHOOK_DRAFT_EMAIL",
  "email-builder": "N8N_WEBHOOK_EMAIL_BUILDER",
  "agent-tasks": "N8N_WEBHOOK_AGENT_TASKS",
  "todo-contacts": "N8N_WEBHOOK_TODO_CONTACTS",
  "voice-transcription": "N8N_WEBHOOK_VOICE_TRANSCRIPTION",
  "todo": "N8N_WEBHOOK_TODO",
  "email-draft": "N8N_WEBHOOK_EMAIL_DRAFT",
  "sql-agent": "N8N_WEBHOOK_SQL_AGENT",
  "opportunities-email": "N8N_WEBHOOK_OPPORTUNITIES_EMAIL",
  "group-contact": "N8N_WEBHOOK_GROUP_CONTACT",
};

Deno.serve(async (req) => {
  // Build request-aware CORS headers once per request
  const corsHeaders = buildCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT - authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get the target endpoint from the header
    const endpointKey = req.headers.get("x-n8n-endpoint");
    if (!endpointKey) {
      return new Response(
        JSON.stringify({ error: "Missing x-n8n-endpoint header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Resolve the endpoint URL from environment
    const envKey = ENDPOINT_MAP[endpointKey];
    if (!envKey) {
      return new Response(
        JSON.stringify({ error: `Unknown endpoint: ${endpointKey}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookUrl = Deno.env.get(envKey);
    if (!webhookUrl) {
      console.error(`Environment variable ${envKey} is not configured`);
      return new Response(
        JSON.stringify({ error: "Webhook endpoint not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Forward the request to n8n
    const contentType = req.headers.get("content-type") || "";
    let forwardBody: BodyInit;
    const forwardHeaders: Record<string, string> = {};

    if (contentType.includes("multipart/form-data")) {
      // For FormData (e.g., voice transcription), forward as-is
      forwardBody = await req.arrayBuffer();
      forwardHeaders["Content-Type"] = contentType;
    } else {
      // For JSON payloads
      forwardBody = await req.text();
      forwardHeaders["Content-Type"] = "application/json";
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: forwardBody,
    });

    // 5. Return the n8n response to the client
    const responseBody = await n8nResponse.text();
    return new Response(responseBody, {
      status: n8nResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": n8nResponse.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("n8n_proxy error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
