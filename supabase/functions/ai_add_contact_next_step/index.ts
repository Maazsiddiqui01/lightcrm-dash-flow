/**
 * Edge Function: ai_add_contact_next_step
 * 
 * Purpose: Adds a new "next step" entry for a contact.
 * Called by: n8n or other backend orchestrators via HTTP POST.
 * 
 * Request JSON:
 * {
 *   "contactId": "uuid",          // Required - ID from contacts_raw.id
 *   "content": "string",          // Required - The next step text
 *   "dueDate": "YYYY-MM-DD"|null  // Optional - ISO date string or null
 * }
 * 
 * Response (success): { "ok": true, "data": { contactId, insertedEventId, latestNextStep, latestDueDate } }
 * Response (error): { "ok": false, "errorCode": "...", "message": "..." }
 * 
 * Tables touched:
 * - contacts_raw (SELECT to verify existence, UPDATE next_steps + next_steps_due_date)
 * - contact_note_events (INSERT new event row with field='next_steps')
 * 
 * Security: Requires x-edge-api-key header matching EDGE_FUNCTION_API_KEY env var
 * 
 * Example curl:
 * curl -X POST "https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/ai_add_contact_next_step" \
 *   -H "Content-Type: application/json" \
 *   -H "x-edge-api-key: your-api-key-here" \
 *   -d '{"contactId": "abc-123", "content": "Schedule intro call", "dueDate": "2025-01-15"}'
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
  let body: { contactId?: string; content?: string; dueDate?: string | null };
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON");
  }

  const { contactId, content, dueDate } = body;

  // Validate required fields
  if (!contactId || typeof contactId !== "string" || contactId.trim() === "") {
    return jsonError("MISSING_FIELDS", "contactId is required and must be a non-empty string");
  }

  if (!content || typeof content !== "string" || content.trim() === "") {
    return jsonError("MISSING_FIELDS", "content is required and must be a non-empty string");
  }

  // Validate UUID format
  if (!isValidUUID(contactId)) {
    return jsonError("INVALID_FORMAT", "contactId must be a valid UUID");
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
    // Step 1: Verify contact exists
    const { data: contact, error: fetchError } = await supabase
      .from("contacts_raw")
      .select("id, full_name")
      .eq("id", contactId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching contact:", fetchError);
      return jsonError("DB_ERROR", `Database error: ${fetchError.message}`, 500);
    }

    if (!contact) {
      return jsonError("CONTACT_NOT_FOUND", `No contact found with id: ${contactId}`, 404);
    }

    // Step 2: Insert into contact_note_events
    const { data: insertedEvent, error: insertError } = await supabase
      .from("contact_note_events")
      .insert({
        contact_id: contactId,
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

    // Step 3: Update contacts_raw with latest next step
    const { error: updateError } = await supabase
      .from("contacts_raw")
      .update({
        next_steps: content.trim(),
        next_steps_due_date: dueDate || null,
      })
      .eq("id", contactId);

    if (updateError) {
      console.error("Error updating contact:", updateError);
      return jsonError(
        "DB_ERROR",
        `Event inserted (id: ${insertedEvent.id}) but failed to update contact: ${updateError.message}. Manual cleanup may be needed.`,
        500
      );
    }

    // Success
    console.log(`Successfully added next step for contact ${contactId}, event id: ${insertedEvent.id}`);

    return jsonOk({
      contactId,
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
