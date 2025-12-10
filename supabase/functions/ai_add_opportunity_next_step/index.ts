/**
 * Edge Function: ai_add_opportunity_next_step
 * 
 * Purpose: Adds a new "next step" entry for an opportunity.
 * Called by: n8n or other backend orchestrators via HTTP POST.
 * 
 * Request JSON:
 * {
 *   "opportunityId": "uuid",      // Required - ID from opportunities_raw.id
 *   "content": "string",          // Required - The next step text
 *   "dueDate": "YYYY-MM-DD"|null  // Optional - ISO date string or null
 * }
 * 
 * Response (success):
 * {
 *   "ok": true,
 *   "data": {
 *     "opportunityId": "uuid",
 *     "insertedEventId": "uuid",
 *     "latestNextStep": "string",
 *     "latestDueDate": "date or null"
 *   }
 * }
 * 
 * Response (error):
 * {
 *   "ok": false,
 *   "errorCode": "MISSING_FIELDS" | "OPPORTUNITY_NOT_FOUND" | "UNAUTHORIZED" | "DB_ERROR",
 *   "message": "Human readable explanation"
 * }
 * 
 * Tables touched:
 * - opportunities_raw (SELECT to verify existence, UPDATE next_steps + next_steps_due_date)
 * - opportunity_note_events (INSERT new event row)
 * 
 * Security:
 * - Requires x-edge-api-key header matching EDGE_FUNCTION_API_KEY env var
 * 
 * Example curl:
 * curl -X POST "https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/ai_add_opportunity_next_step" \
 *   -H "Content-Type: application/json" \
 *   -H "x-edge-api-key: your-api-key-here" \
 *   -d '{"opportunityId": "abc-123", "content": "Follow up with CEO", "dueDate": "2025-01-15"}'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-edge-api-key",
};

// Helper to create consistent JSON responses
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(errorCode: string, message: string, status = 400): Response {
  return jsonResponse({ ok: false, errorCode, message }, status);
}

function successResponse(data: Record<string, unknown>): Response {
  return jsonResponse({ ok: true, data });
}

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Validate ISO date format (YYYY-MM-DD)
function isValidISODate(str: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(str)) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST requests are allowed", 405);
  }

  // API Key authentication
  const apiKey = Deno.env.get("EDGE_FUNCTION_API_KEY");
  const providedKey = req.headers.get("x-edge-api-key");

  if (!apiKey) {
    console.error("EDGE_FUNCTION_API_KEY not configured");
    return errorResponse("CONFIG_ERROR", "Server configuration error", 500);
  }

  if (!providedKey || providedKey !== apiKey) {
    return errorResponse("UNAUTHORIZED", "Invalid or missing API key", 401);
  }

  // Parse request body
  let body: { opportunityId?: string; content?: string; dueDate?: string | null };
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const { opportunityId, content, dueDate } = body;

  // Validate required fields
  if (!opportunityId || typeof opportunityId !== "string" || opportunityId.trim() === "") {
    return errorResponse("MISSING_FIELDS", "opportunityId is required and must be a non-empty string");
  }

  if (!content || typeof content !== "string" || content.trim() === "") {
    return errorResponse("MISSING_FIELDS", "content is required and must be a non-empty string");
  }

  // Validate UUID format
  if (!isValidUUID(opportunityId)) {
    return errorResponse("INVALID_FORMAT", "opportunityId must be a valid UUID");
  }

  // Validate dueDate format if provided
  if (dueDate !== null && dueDate !== undefined) {
    if (typeof dueDate !== "string" || !isValidISODate(dueDate)) {
      return errorResponse("INVALID_FORMAT", "dueDate must be a valid ISO date (YYYY-MM-DD) or null");
    }
  }

  // Create Supabase client with service role for database operations
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration");
    return errorResponse("CONFIG_ERROR", "Server configuration error", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Verify opportunity exists
    const { data: opportunity, error: fetchError } = await supabase
      .from("opportunities_raw")
      .select("id, deal_name")
      .eq("id", opportunityId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching opportunity:", fetchError);
      return errorResponse("DB_ERROR", `Database error: ${fetchError.message}`, 500);
    }

    if (!opportunity) {
      return errorResponse("OPPORTUNITY_NOT_FOUND", `No opportunity found with id: ${opportunityId}`, 404);
    }

    // Step 2: Insert into opportunity_note_events
    const { data: insertedEvent, error: insertError } = await supabase
      .from("opportunity_note_events")
      .insert({
        opportunity_id: opportunityId,
        field: "next_steps",
        content: content.trim(),
        due_date: dueDate || null,
        created_by: null, // UUID column - null for API calls
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting event:", insertError);
      return errorResponse("DB_ERROR", `Failed to insert event: ${insertError.message}`, 500);
    }

    // Step 3: Update opportunities_raw with latest next step
    const { error: updateError } = await supabase
      .from("opportunities_raw")
      .update({
        next_steps: content.trim(),
        next_steps_due_date: dueDate || null,
      })
      .eq("id", opportunityId);

    if (updateError) {
      console.error("Error updating opportunity:", updateError);
      // Event was inserted but update failed - return error with context
      return errorResponse(
        "DB_ERROR",
        `Event inserted (id: ${insertedEvent.id}) but failed to update opportunity: ${updateError.message}. Manual cleanup may be needed.`,
        500
      );
    }

    // Success
    console.log(`Successfully added next step for opportunity ${opportunityId}, event id: ${insertedEvent.id}`);
    
    return successResponse({
      opportunityId,
      insertedEventId: insertedEvent.id,
      latestNextStep: content.trim(),
      latestDueDate: dueDate || null,
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return errorResponse("DB_ERROR", `Unexpected error: ${message}`, 500);
  }
});
