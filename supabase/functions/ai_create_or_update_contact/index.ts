/**
 * Edge Function: ai_create_or_update_contact
 * 
 * Purpose: Creates a new contact or updates an existing one with whitelisted fields only.
 * Called by: n8n or other backend orchestrators via HTTP POST.
 * 
 * Security: Requires x-edge-api-key header matching EDGE_FUNCTION_API_KEY env var.
 * 
 * Request JSON:
 * {
 *   "mode": "create" | "update",
 *   "contactId"?: "uuid",                   // Required for update
 *   "fullName"?: "string",
 *   "firstName"?: "string",
 *   "lastName"?: "string",
 *   "email"?: "string",                     // Required for create
 *   "title"?: "string | null",
 *   "organization"?: "string | null",
 *   "phone"?: "string | null",
 *   "city"?: "string | null",
 *   "state"?: "string | null",
 *   "lgSector"?: "string | null",
 *   "lgLead"?: "string | null",
 *   "lgAssistant"?: "string | null",
 *   "linkedinUrl"?: "string | null",
 *   "twitterUrl"?: "string | null",
 *   "bioUrl"?: "string | null",
 *   "notes"?: "string | null",
 *   "nextSteps"?: "string | null",
 *   "areasOfSpecialization"?: "string | null",
 *   "category"?: "string | null",
 *   "contactType"?: "string | null",
 *   "priority"?: boolean
 * }
 * 
 * Field Mapping:
 *   fullName → full_name
 *   firstName → first_name
 *   lastName → last_name
 *   email → email_address
 *   title → title
 *   organization → organization
 *   phone → phone
 *   city → city
 *   state → state
 *   lgSector → lg_sector
 *   lgLead → lg_lead
 *   lgAssistant → lg_assistant
 *   linkedinUrl → linkedin_url
 *   twitterUrl → x_twitter_url
 *   bioUrl → url_to_online_bio
 *   notes → notes
 *   nextSteps → next_steps
 *   areasOfSpecialization → areas_of_specialization
 *   category → category
 *   contactType → contact_type
 *   priority → priority
 * 
 * Response (success): { "ok": true, "data": { id, mode, savedFields } }
 * Response (error): { "ok": false, "errorCode": "...", "message": "..." }
 * 
 * Example curl (create):
 * curl -X POST "https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/ai_create_or_update_contact" \
 *   -H "Content-Type: application/json" \
 *   -H "x-edge-api-key: your-api-key-here" \
 *   -d '{"mode": "create", "fullName": "John Doe", "email": "john@example.com", "organization": "Acme Corp"}'
 * 
 * Example curl (update):
 * curl -X POST "https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/ai_create_or_update_contact" \
 *   -H "Content-Type: application/json" \
 *   -H "x-edge-api-key: your-api-key-here" \
 *   -d '{"mode": "update", "contactId": "uuid-here", "title": "CEO", "notes": "Met at conference"}'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireApiKey, jsonOk, jsonError, handleCors, isValidUUID } from "../_shared/edgeUtils.ts";

// Payload type
interface Payload {
  mode?: string;
  contactId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string | null;
  organization?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  lgSector?: string | null;
  lgLead?: string | null;
  lgAssistant?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  bioUrl?: string | null;
  notes?: string | null;
  nextSteps?: string | null;
  areasOfSpecialization?: string | null;
  category?: string | null;
  contactType?: string | null;
  priority?: boolean;
}

// Build database object from payload (only include defined fields)
function buildDbObject(payload: Payload): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  if (payload.fullName !== undefined) obj.full_name = payload.fullName?.trim() || null;
  if (payload.firstName !== undefined) obj.first_name = payload.firstName?.trim() || null;
  if (payload.lastName !== undefined) obj.last_name = payload.lastName?.trim() || null;
  if (payload.email !== undefined) obj.email_address = payload.email?.trim().toLowerCase() || null;
  if (payload.title !== undefined) obj.title = payload.title?.trim() || null;
  if (payload.organization !== undefined) obj.organization = payload.organization?.trim() || null;
  if (payload.phone !== undefined) obj.phone = payload.phone?.trim() || null;
  if (payload.city !== undefined) obj.city = payload.city?.trim() || null;
  if (payload.state !== undefined) obj.state = payload.state?.trim() || null;
  if (payload.lgSector !== undefined) obj.lg_sector = payload.lgSector?.trim() || null;
  if (payload.lgLead !== undefined) obj.lg_lead = payload.lgLead?.trim() || null;
  if (payload.lgAssistant !== undefined) obj.lg_assistant = payload.lgAssistant?.trim() || null;
  if (payload.linkedinUrl !== undefined) obj.linkedin_url = payload.linkedinUrl?.trim() || null;
  if (payload.twitterUrl !== undefined) obj.x_twitter_url = payload.twitterUrl?.trim() || null;
  if (payload.bioUrl !== undefined) obj.url_to_online_bio = payload.bioUrl?.trim() || null;
  if (payload.notes !== undefined) obj.notes = payload.notes?.trim() || null;
  if (payload.nextSteps !== undefined) obj.next_steps = payload.nextSteps?.trim() || null;
  if (payload.areasOfSpecialization !== undefined) obj.areas_of_specialization = payload.areasOfSpecialization?.trim() || null;
  if (payload.category !== undefined) obj.category = payload.category?.trim() || null;
  if (payload.contactType !== undefined) obj.contact_type = payload.contactType?.trim() || null;
  if (payload.priority !== undefined) obj.priority = payload.priority;

  return obj;
}

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
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON");
  }

  // Validate mode
  const { mode } = payload;
  if (!mode || (mode !== "create" && mode !== "update")) {
    return jsonError("INVALID_MODE", "mode must be 'create' or 'update'");
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
    // ========== CREATE MODE ==========
    if (mode === "create") {
      if (!payload.email || typeof payload.email !== "string" || payload.email.trim() === "") {
        return jsonError("MISSING_FIELDS", "email is required for create mode");
      }

      const insertData = buildDbObject(payload);

      const { data: inserted, error: insertError } = await supabase
        .from("contacts_raw")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError) {
        console.error("Error inserting contact:", insertError);
        return jsonError("DB_ERROR", `Failed to create contact: ${insertError.message}`, 500);
      }

      console.log(`Created contact ${inserted.id} with email: ${payload.email}`);

      return jsonOk({
        id: inserted.id,
        mode: "create",
        savedFields: insertData,
      });
    }

    // ========== UPDATE MODE ==========
    if (mode === "update") {
      const { contactId } = payload;

      if (!contactId || typeof contactId !== "string" || contactId.trim() === "") {
        return jsonError("MISSING_ID", "contactId is required for update mode");
      }

      if (!isValidUUID(contactId)) {
        return jsonError("INVALID_FORMAT", "contactId must be a valid UUID");
      }

      const { data: existing, error: fetchError } = await supabase
        .from("contacts_raw")
        .select("id")
        .eq("id", contactId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching contact:", fetchError);
        return jsonError("DB_ERROR", `Database error: ${fetchError.message}`, 500);
      }

      if (!existing) {
        return jsonError("CONTACT_NOT_FOUND", `No contact found with id: ${contactId}`, 404);
      }

      const updateData = buildDbObject(payload);

      if (Object.keys(updateData).length === 0) {
        return jsonError("MISSING_FIELDS", "No fields provided to update");
      }

      const { error: updateError } = await supabase
        .from("contacts_raw")
        .update(updateData)
        .eq("id", contactId);

      if (updateError) {
        console.error("Error updating contact:", updateError);
        return jsonError("DB_ERROR", `Failed to update contact: ${updateError.message}`, 500);
      }

      console.log(`Updated contact ${contactId} with fields:`, Object.keys(updateData));

      return jsonOk({
        id: contactId,
        mode: "update",
        savedFields: updateData,
      });
    }

    return jsonError("INVALID_MODE", "mode must be 'create' or 'update'");

  } catch (err) {
    console.error("Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return jsonError("DB_ERROR", `Unexpected error: ${message}`, 500);
  }
});
