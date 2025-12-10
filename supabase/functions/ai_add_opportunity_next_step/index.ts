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
 * Response (success): { "ok": true, "data": { opportunityId, insertedEventId, latestNextStep, latestDueDate } }
 * Response (error): { "ok": false, "errorCode": "...", "message": "..." }
 * 
 * Tables touched:
 * - opportunities_raw (SELECT to verify existence, UPDATE next_steps + next_steps_due_date)
 * - opportunity_note_events (INSERT new event row)
 * 
 * Security: Requires x-edge-api-key header matching EDGE_FUNCTION_API_KEY env var
 * 
 * Example curl:
 * curl -X POST "https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/ai_add_opportunity_next_step" \
 *   -H "Content-Type: application/json" \
 *   -H "x-edge-api-key: your-api-key-here" \
 *   -d '{"opportunityId": "abc-123", "content": "Follow up with CEO", "dueDate": "2025-01-15"}'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireApiKey, jsonOk, jsonError, handleCors, isValidUUID, isValidISODate } from "../_shared/edgeUtils.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCors();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Only POST requests are allowed", 405);
  }

  // API Key authentication
  const unauthorized = requireApiKey(req);
  if (unauthorized) return unauthorized;

  // Parse request body
  let body: { opportunityId?: string; content?: string; dueDate?: string | null };
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON");
  }

  const { opportunityId, content, dueDate } = body;

  // Validate required fields
  if (!opportunityId || typeof opportunityId !== "string" || opportunityId.trim() === "") {
    return jsonError("MISSING_FIELDS", "opportunityId is required and must be a non-empty string");
  }

  if (!content || typeof content !== "string" || content.trim() === "") {
    return jsonError("MISSING_FIELDS", "content is required and must be a non-empty string");
  }

  // Validate UUID format
  if (!isValidUUID(opportunityId)) {
    return jsonError("INVALID_FORMAT", "opportunityId must be a valid UUID");
  }

  // Validate dueDate format if provided
  if (dueDate !== null && dueDate !== undefined) {
    if (typeof dueDate !== "string" || !isValidISODate(dueDate)) {
      return jsonError("INVALID_FORMAT", "dueDate must be a valid ISO date (YYYY-MM-DD) or null");
    }
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration");
    return jsonError("CONFIG_ERROR", "Server configuration error", 500);
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
      return jsonError("DB_ERROR", `Database error: ${fetchError.message}`, 500);
    }

    if (!opportunity) {
      return jsonError("OPPORTUNITY_NOT_FOUND", `No opportunity found with id: ${opportunityId}`, 404);
    }

    // Step 2: Insert into opportunity_note_events
    const { data: insertedEvent, error: insertError } = await supabase
      .from("opportunity_note_events")
      .insert({
        opportunity_id: opportunityId,
        field: "next_steps",
        content: content.trim(),
        due_date: dueDate || null,
        created_by: null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting event:", insertError);
      return jsonError("DB_ERROR", `Failed to insert event: ${insertError.message}`, 500);
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
      return jsonError(
        "DB_ERROR",
        `Event inserted (id: ${insertedEvent.id}) but failed to update opportunity: ${updateError.message}. Manual cleanup may be needed.`,
        500
      );
    }

    // Success
    console.log(`Successfully added next step for opportunity ${opportunityId}, event id: ${insertedEvent.id}`);

    return jsonOk({
      opportunityId,
      insertedEventId: insertedEvent.id,
      latestNextStep: content.trim(),
      latestDueDate: dueDate || null,
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return jsonError("DB_ERROR", `Unexpected error: ${message}`, 500);
  }
});
