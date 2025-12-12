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
 *   "contactId"?: "uuid",                         // Required for update
 *   "fullName"?: "string",
 *   "firstName"?: "string",
 *   "lastName"?: "string",
 *   "email"?: "string",                           // Required for create
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
 *   "nextStepsDueDate"?: "ISO date string | null",
 *   "areasOfSpecialization"?: "string | null",
 *   "category"?: "string | null",
 *   "contactType"?: "string | null",
 *   "priority"?: boolean,
 *   "lgFocusAreasComprehensiveList"?: "string | null",
 *   "lgFocusArea1"?: "string | null",
 *   "lgFocusArea2"?: "string | null",
 *   "lgFocusArea3"?: "string | null",
 *   "lgFocusArea4"?: "string | null",
 *   "lgFocusArea5"?: "string | null",
 *   "lgFocusArea6"?: "string | null",
 *   "lgFocusArea7"?: "string | null",
 *   "lgFocusArea8"?: "string | null",
 *   "deltaType"?: "string | null",
 *   "followUpDays"?: number | null,
 *   "followUpRecencyThreshold"?: number | null,
 *   "followUpDate"?: "ISO date string | null",
 *   "groupContact"?: "string | null",
 *   "groupEmailRole"?: "string | null",
 *   "groupFocusArea"?: "string | null",
 *   "groupSector"?: "string | null",
 *   "groupNotes"?: "string | null"
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
 *   nextStepsDueDate → next_steps_due_date
 *   areasOfSpecialization → areas_of_specialization
 *   category → category
 *   contactType → contact_type
 *   priority → priority
 *   lgFocusAreasComprehensiveList → lg_focus_areas_comprehensive_list
 *   lgFocusArea1 → lg_focus_area_1
 *   lgFocusArea2 → lg_focus_area_2
 *   lgFocusArea3 → lg_focus_area_3
 *   lgFocusArea4 → lg_focus_area_4
 *   lgFocusArea5 → lg_focus_area_5
 *   lgFocusArea6 → lg_focus_area_6
 *   lgFocusArea7 → lg_focus_area_7
 *   lgFocusArea8 → lg_focus_area_8
 *   deltaType → delta_type
 *   followUpDays → follow_up_days
 *   followUpRecencyThreshold → follow_up_recency_threshold
 *   followUpDate → follow_up_date
 *   groupContact → group_contact
 *   groupEmailRole → group_email_role
 *   groupFocusArea → group_focus_area
 *   groupSector → group_sector
 *   groupNotes → group_notes
 * 
 * Response (success): { "ok": true, "data": { id, mode, savedFields } }
 * Response (error): { "ok": false, "errorCode": "...", "message": "..." }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireApiKey, jsonOk, jsonError, handleCors, isValidUUID } from "../_shared/edgeUtils.ts";

// Payload type
interface Payload {
  mode?: string;
  contactId?: string;
  // Core fields
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  title?: string | null;
  organization?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  // LG fields
  lgSector?: string | null;
  lgLead?: string | null;
  lgAssistant?: string | null;
  // Social URLs
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  bioUrl?: string | null;
  // Notes and next steps
  notes?: string | null;
  nextSteps?: string | null;
  nextStepsDueDate?: string | null;
  // Classification
  areasOfSpecialization?: string | null;
  category?: string | null;
  contactType?: string | null;
  priority?: boolean;
  // Focus areas
  lgFocusAreasComprehensiveList?: string | null;
  lgFocusArea1?: string | null;
  lgFocusArea2?: string | null;
  lgFocusArea3?: string | null;
  lgFocusArea4?: string | null;
  lgFocusArea5?: string | null;
  lgFocusArea6?: string | null;
  lgFocusArea7?: string | null;
  lgFocusArea8?: string | null;
  // Tracking
  deltaType?: string | null;
  followUpDays?: number | null;
  followUpRecencyThreshold?: number | null;
  followUpDate?: string | null;
  // Group fields
  groupContact?: string | null;
  groupEmailRole?: string | null;
  groupFocusArea?: string | null;
  groupSector?: string | null;
  groupNotes?: string | null;
}

// Helper: Check if a value is a non-empty string
function isNonEmptyString(val: unknown): val is string {
  return val != null && typeof val === 'string' && val.trim() !== '';
}

// Helper: Check if a value is a valid number
function isValidNumber(val: unknown): boolean {
  return val != null && !isNaN(Number(val));
}

// Helper: Check if a value is an explicit boolean
function isExplicitBoolean(val: unknown): val is boolean {
  return val === true || val === false;
}

// Build database object from payload (only include fields with meaningful values)
// Gracefully handles null, undefined, and empty strings by skipping them
function buildDbObject(payload: Payload): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  // Core string fields - only include if non-empty
  if (isNonEmptyString(payload.fullName)) obj.full_name = payload.fullName.trim();
  if (isNonEmptyString(payload.firstName)) obj.first_name = payload.firstName.trim();
  if (isNonEmptyString(payload.lastName)) obj.last_name = payload.lastName.trim();
  if (isNonEmptyString(payload.email)) obj.email_address = payload.email.trim().toLowerCase();
  if (isNonEmptyString(payload.title)) obj.title = payload.title.trim();
  if (isNonEmptyString(payload.organization)) obj.organization = payload.organization.trim();
  if (isNonEmptyString(payload.phone)) obj.phone = payload.phone.trim();
  if (isNonEmptyString(payload.city)) obj.city = payload.city.trim();
  if (isNonEmptyString(payload.state)) obj.state = payload.state.trim();

  // LG fields
  if (isNonEmptyString(payload.lgSector)) obj.lg_sector = payload.lgSector.trim();
  if (isNonEmptyString(payload.lgLead)) obj.lg_lead = payload.lgLead.trim();
  if (isNonEmptyString(payload.lgAssistant)) obj.lg_assistant = payload.lgAssistant.trim();

  // Social URLs
  if (isNonEmptyString(payload.linkedinUrl)) obj.linkedin_url = payload.linkedinUrl.trim();
  if (isNonEmptyString(payload.twitterUrl)) obj.x_twitter_url = payload.twitterUrl.trim();
  if (isNonEmptyString(payload.bioUrl)) obj.url_to_online_bio = payload.bioUrl.trim();

  // Notes and next steps
  if (isNonEmptyString(payload.notes)) obj.notes = payload.notes.trim();
  if (isNonEmptyString(payload.nextSteps)) obj.next_steps = payload.nextSteps.trim();
  if (isNonEmptyString(payload.nextStepsDueDate)) obj.next_steps_due_date = payload.nextStepsDueDate.trim();

  // Classification
  if (isNonEmptyString(payload.areasOfSpecialization)) obj.areas_of_specialization = payload.areasOfSpecialization.trim();
  if (isNonEmptyString(payload.category)) obj.category = payload.category.trim();
  if (isNonEmptyString(payload.contactType)) obj.contact_type = payload.contactType.trim();
  if (isExplicitBoolean(payload.priority)) obj.priority = payload.priority;

  // Focus areas
  if (isNonEmptyString(payload.lgFocusAreasComprehensiveList)) obj.lg_focus_areas_comprehensive_list = payload.lgFocusAreasComprehensiveList.trim();
  if (isNonEmptyString(payload.lgFocusArea1)) obj.lg_focus_area_1 = payload.lgFocusArea1.trim();
  if (isNonEmptyString(payload.lgFocusArea2)) obj.lg_focus_area_2 = payload.lgFocusArea2.trim();
  if (isNonEmptyString(payload.lgFocusArea3)) obj.lg_focus_area_3 = payload.lgFocusArea3.trim();
  if (isNonEmptyString(payload.lgFocusArea4)) obj.lg_focus_area_4 = payload.lgFocusArea4.trim();
  if (isNonEmptyString(payload.lgFocusArea5)) obj.lg_focus_area_5 = payload.lgFocusArea5.trim();
  if (isNonEmptyString(payload.lgFocusArea6)) obj.lg_focus_area_6 = payload.lgFocusArea6.trim();
  if (isNonEmptyString(payload.lgFocusArea7)) obj.lg_focus_area_7 = payload.lgFocusArea7.trim();
  if (isNonEmptyString(payload.lgFocusArea8)) obj.lg_focus_area_8 = payload.lgFocusArea8.trim();

  // Tracking - numbers only if valid
  if (isNonEmptyString(payload.deltaType)) obj.delta_type = payload.deltaType.trim();
  if (isValidNumber(payload.followUpDays)) obj.follow_up_days = Number(payload.followUpDays);
  if (isValidNumber(payload.followUpRecencyThreshold)) obj.follow_up_recency_threshold = Number(payload.followUpRecencyThreshold);
  if (isNonEmptyString(payload.followUpDate)) obj.follow_up_date = payload.followUpDate.trim();

  // Group fields
  if (isNonEmptyString(payload.groupContact)) obj.group_contact = payload.groupContact.trim();
  if (isNonEmptyString(payload.groupEmailRole)) obj.group_email_role = payload.groupEmailRole.trim();
  if (isNonEmptyString(payload.groupFocusArea)) obj.group_focus_area = payload.groupFocusArea.trim();
  if (isNonEmptyString(payload.groupSector)) obj.group_sector = payload.groupSector.trim();
  if (isNonEmptyString(payload.groupNotes)) obj.group_notes = payload.groupNotes.trim();

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
