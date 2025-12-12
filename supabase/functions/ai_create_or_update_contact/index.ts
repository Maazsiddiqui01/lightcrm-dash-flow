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

// Build database object from payload (only include defined fields)
function buildDbObject(payload: Payload): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  // Core fields
  if (payload.fullName !== undefined) obj.full_name = payload.fullName?.trim() || null;
  if (payload.firstName !== undefined) obj.first_name = payload.firstName?.trim() || null;
  if (payload.lastName !== undefined) obj.last_name = payload.lastName?.trim() || null;
  if (payload.email !== undefined) obj.email_address = payload.email?.trim().toLowerCase() || null;
  if (payload.title !== undefined) obj.title = payload.title?.trim() || null;
  if (payload.organization !== undefined) obj.organization = payload.organization?.trim() || null;
  if (payload.phone !== undefined) obj.phone = payload.phone?.trim() || null;
  if (payload.city !== undefined) obj.city = payload.city?.trim() || null;
  if (payload.state !== undefined) obj.state = payload.state?.trim() || null;

  // LG fields
  if (payload.lgSector !== undefined) obj.lg_sector = payload.lgSector?.trim() || null;
  if (payload.lgLead !== undefined) obj.lg_lead = payload.lgLead?.trim() || null;
  if (payload.lgAssistant !== undefined) obj.lg_assistant = payload.lgAssistant?.trim() || null;

  // Social URLs
  if (payload.linkedinUrl !== undefined) obj.linkedin_url = payload.linkedinUrl?.trim() || null;
  if (payload.twitterUrl !== undefined) obj.x_twitter_url = payload.twitterUrl?.trim() || null;
  if (payload.bioUrl !== undefined) obj.url_to_online_bio = payload.bioUrl?.trim() || null;

  // Notes and next steps
  if (payload.notes !== undefined) obj.notes = payload.notes?.trim() || null;
  if (payload.nextSteps !== undefined) obj.next_steps = payload.nextSteps?.trim() || null;
  if (payload.nextStepsDueDate !== undefined) obj.next_steps_due_date = payload.nextStepsDueDate || null;

  // Classification
  if (payload.areasOfSpecialization !== undefined) obj.areas_of_specialization = payload.areasOfSpecialization?.trim() || null;
  if (payload.category !== undefined) obj.category = payload.category?.trim() || null;
  if (payload.contactType !== undefined) obj.contact_type = payload.contactType?.trim() || null;
  if (payload.priority !== undefined) obj.priority = payload.priority;

  // Focus areas
  if (payload.lgFocusAreasComprehensiveList !== undefined) obj.lg_focus_areas_comprehensive_list = payload.lgFocusAreasComprehensiveList?.trim() || null;
  if (payload.lgFocusArea1 !== undefined) obj.lg_focus_area_1 = payload.lgFocusArea1?.trim() || null;
  if (payload.lgFocusArea2 !== undefined) obj.lg_focus_area_2 = payload.lgFocusArea2?.trim() || null;
  if (payload.lgFocusArea3 !== undefined) obj.lg_focus_area_3 = payload.lgFocusArea3?.trim() || null;
  if (payload.lgFocusArea4 !== undefined) obj.lg_focus_area_4 = payload.lgFocusArea4?.trim() || null;
  if (payload.lgFocusArea5 !== undefined) obj.lg_focus_area_5 = payload.lgFocusArea5?.trim() || null;
  if (payload.lgFocusArea6 !== undefined) obj.lg_focus_area_6 = payload.lgFocusArea6?.trim() || null;
  if (payload.lgFocusArea7 !== undefined) obj.lg_focus_area_7 = payload.lgFocusArea7?.trim() || null;
  if (payload.lgFocusArea8 !== undefined) obj.lg_focus_area_8 = payload.lgFocusArea8?.trim() || null;

  // Tracking
  if (payload.deltaType !== undefined) obj.delta_type = payload.deltaType?.trim() || null;
  if (payload.followUpDays !== undefined) {
    obj.follow_up_days = payload.followUpDays !== null ? Number(payload.followUpDays) : null;
  }
  if (payload.followUpRecencyThreshold !== undefined) {
    obj.follow_up_recency_threshold = payload.followUpRecencyThreshold !== null ? Number(payload.followUpRecencyThreshold) : null;
  }
  if (payload.followUpDate !== undefined) obj.follow_up_date = payload.followUpDate || null;

  // Group fields
  if (payload.groupContact !== undefined) obj.group_contact = payload.groupContact?.trim() || null;
  if (payload.groupEmailRole !== undefined) obj.group_email_role = payload.groupEmailRole?.trim() || null;
  if (payload.groupFocusArea !== undefined) obj.group_focus_area = payload.groupFocusArea?.trim() || null;
  if (payload.groupSector !== undefined) obj.group_sector = payload.groupSector?.trim() || null;
  if (payload.groupNotes !== undefined) obj.group_notes = payload.groupNotes?.trim() || null;

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
