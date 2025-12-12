/**
 * Edge Function: ai_create_or_update_opportunity
 * 
 * Purpose: Creates a new opportunity or updates an existing one with whitelisted fields only.
 * Called by: n8n or other backend orchestrators via HTTP POST.
 * 
 * Security: Requires x-edge-api-key header matching EDGE_FUNCTION_API_KEY env var.
 * 
 * Request JSON:
 * {
 *   "mode": "create" | "update",
 *   "opportunityId"?: "uuid",                    // Required for update
 *   "dealName": "string",                        // Required for create
 *   "sector"?: "Healthcare" | "Industrials" | "Services" | "General",
 *   "tier"?: "string",
 *   "headquarters"?: "string | null",
 *   "summaryOfOpportunity"?: "string | null",
 *   "lgTeam"?: "string | null",
 *   "lgLead1"?: "string | null",
 *   "lgLead2"?: "string | null",
 *   "lgLead3"?: "string | null",
 *   "lgLead4"?: "string | null",
 *   "dealSourceCompany"?: "string | null",
 *   "dealSourceIndividual1"?: "string | null",
 *   "dealSourceIndividual2"?: "string | null",
 *   "mostRecentNotes"?: "string | null",
 *   "lgFocusArea"?: "string | null",
 *   "platformAddOn"?: "string | null",
 *   "url"?: "string | null",
 *   "ebitdaInMs"?: number | null,
 *   "ebitdaNotes"?: "string | null",
 *   "revenue"?: number | null,
 *   "estDealSize"?: number | null,
 *   "estLgEquityInvest"?: number | null,
 *   "ownership"?: "string | null",
 *   "ownershipType"?: "string | null",
 *   "dateOfOrigination"?: "ISO date string | null",
 *   "processTimeline"?: "string | null",
 *   "funds"?: "string | null",
 *   "acquisitionDate"?: "ISO date string | null",
 *   "dealcloud"?: boolean,
 *   "nextSteps"?: "string | null",
 *   "nextStepsDueDate"?: "ISO date string | null",
 *   "priority"?: boolean
 * }
 * 
 * Field Mapping:
 *   dealName → deal_name
 *   sector → sector (Insurance→Services normalization)
 *   tier → tier
 *   headquarters → headquarters
 *   summaryOfOpportunity → summary_of_opportunity
 *   lgTeam → lg_team
 *   lgLead1 → investment_professional_point_person_1
 *   lgLead2 → investment_professional_point_person_2
 *   lgLead3 → investment_professional_point_person_3
 *   lgLead4 → investment_professional_point_person_4
 *   dealSourceCompany → deal_source_company
 *   dealSourceIndividual1 → deal_source_individual_1
 *   dealSourceIndividual2 → deal_source_individual_2
 *   mostRecentNotes → most_recent_notes
 *   lgFocusArea → lg_focus_area
 *   platformAddOn → platform_add_on
 *   url → url
 *   ebitdaInMs → ebitda_in_ms
 *   ebitdaNotes → ebitda_notes
 *   revenue → revenue
 *   estDealSize → est_deal_size
 *   estLgEquityInvest → est_lg_equity_invest
 *   ownership → ownership
 *   ownershipType → ownership_type
 *   dateOfOrigination → date_of_origination
 *   processTimeline → process_timeline
 *   funds → funds
 *   acquisitionDate → acquisition_date
 *   dealcloud → dealcloud
 *   nextSteps → next_steps
 *   nextStepsDueDate → next_steps_due_date
 *   priority → priority
 * 
 * Response (success): { "ok": true, "data": { id, mode, savedFields } }
 * Response (error): { "ok": false, "errorCode": "...", "message": "..." }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireApiKey, jsonOk, jsonError, handleCors, isValidUUID } from "../_shared/edgeUtils.ts";

// Normalize sector: Insurance → Services
function normalizeSector(sector: string | undefined | null): string | null {
  if (!sector) return null;
  const trimmed = sector.trim();
  if (trimmed.toLowerCase() === "insurance") return "Services";
  return trimmed;
}

// Payload type
interface Payload {
  mode?: string;
  opportunityId?: string;
  // Core fields
  dealName?: string;
  sector?: string;
  tier?: string;
  headquarters?: string | null;
  summaryOfOpportunity?: string | null;
  lgTeam?: string | null;
  // LG Leads
  lgLead1?: string | null;
  lgLead2?: string | null;
  lgLead3?: string | null;
  lgLead4?: string | null;
  // Deal source
  dealSourceCompany?: string | null;
  dealSourceIndividual1?: string | null;
  dealSourceIndividual2?: string | null;
  // Notes
  mostRecentNotes?: string | null;
  // Focus area and platform
  lgFocusArea?: string | null;
  platformAddOn?: string | null;
  url?: string | null;
  // Financial metrics
  ebitdaInMs?: number | null;
  ebitdaNotes?: string | null;
  revenue?: number | null;
  estDealSize?: number | null;
  estLgEquityInvest?: number | null;
  // Ownership
  ownership?: string | null;
  ownershipType?: string | null;
  // Dates
  dateOfOrigination?: string | null;
  processTimeline?: string | null;
  funds?: string | null;
  acquisitionDate?: string | null;
  // Tracking
  dealcloud?: boolean;
  nextSteps?: string | null;
  nextStepsDueDate?: string | null;
  priority?: boolean;
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
  if (isNonEmptyString(payload.dealName)) obj.deal_name = payload.dealName.trim();
  if (isNonEmptyString(payload.sector)) obj.sector = normalizeSector(payload.sector);
  if (isNonEmptyString(payload.tier)) obj.tier = payload.tier.trim();
  if (isNonEmptyString(payload.headquarters)) obj.headquarters = payload.headquarters.trim();
  if (isNonEmptyString(payload.summaryOfOpportunity)) obj.summary_of_opportunity = payload.summaryOfOpportunity.trim();
  if (isNonEmptyString(payload.lgTeam)) obj.lg_team = payload.lgTeam.trim();

  // LG Leads
  if (isNonEmptyString(payload.lgLead1)) obj.investment_professional_point_person_1 = payload.lgLead1.trim();
  if (isNonEmptyString(payload.lgLead2)) obj.investment_professional_point_person_2 = payload.lgLead2.trim();
  if (isNonEmptyString(payload.lgLead3)) obj.investment_professional_point_person_3 = payload.lgLead3.trim();
  if (isNonEmptyString(payload.lgLead4)) obj.investment_professional_point_person_4 = payload.lgLead4.trim();

  // Deal source
  if (isNonEmptyString(payload.dealSourceCompany)) obj.deal_source_company = payload.dealSourceCompany.trim();
  if (isNonEmptyString(payload.dealSourceIndividual1)) obj.deal_source_individual_1 = payload.dealSourceIndividual1.trim();
  if (isNonEmptyString(payload.dealSourceIndividual2)) obj.deal_source_individual_2 = payload.dealSourceIndividual2.trim();

  // Notes
  if (isNonEmptyString(payload.mostRecentNotes)) obj.most_recent_notes = payload.mostRecentNotes.trim();

  // Focus area and platform
  if (isNonEmptyString(payload.lgFocusArea)) obj.lg_focus_area = payload.lgFocusArea.trim();
  if (isNonEmptyString(payload.platformAddOn)) obj.platform_add_on = payload.platformAddOn.trim();
  if (isNonEmptyString(payload.url)) obj.url = payload.url.trim();

  // Financial metrics (numbers) - only include if valid number
  if (isValidNumber(payload.ebitdaInMs)) obj.ebitda_in_ms = Number(payload.ebitdaInMs);
  if (isNonEmptyString(payload.ebitdaNotes)) obj.ebitda_notes = payload.ebitdaNotes.trim();
  if (isValidNumber(payload.revenue)) obj.revenue = Number(payload.revenue);
  if (isValidNumber(payload.estDealSize)) obj.est_deal_size = Number(payload.estDealSize);
  if (isValidNumber(payload.estLgEquityInvest)) obj.est_lg_equity_invest = Number(payload.estLgEquityInvest);

  // Ownership
  if (isNonEmptyString(payload.ownership)) obj.ownership = payload.ownership.trim();
  if (isNonEmptyString(payload.ownershipType)) obj.ownership_type = payload.ownershipType.trim();

  // Dates - only include if non-empty string
  if (isNonEmptyString(payload.dateOfOrigination)) obj.date_of_origination = payload.dateOfOrigination.trim();
  if (isNonEmptyString(payload.processTimeline)) obj.process_timeline = payload.processTimeline.trim();
  if (isNonEmptyString(payload.funds)) obj.funds = payload.funds.trim();
  if (isNonEmptyString(payload.acquisitionDate)) obj.acquisition_date = payload.acquisitionDate.trim();

  // Tracking - booleans only if explicit true/false
  if (isExplicitBoolean(payload.dealcloud)) obj.dealcloud = payload.dealcloud;
  if (isNonEmptyString(payload.nextSteps)) obj.next_steps = payload.nextSteps.trim();
  if (isNonEmptyString(payload.nextStepsDueDate)) obj.next_steps_due_date = payload.nextStepsDueDate.trim();
  if (isExplicitBoolean(payload.priority)) obj.priority = payload.priority;

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
      if (!payload.dealName || typeof payload.dealName !== "string" || payload.dealName.trim() === "") {
        return jsonError("MISSING_FIELDS", "dealName is required for create mode");
      }

      const insertData = buildDbObject(payload);

      const { data: inserted, error: insertError } = await supabase
        .from("opportunities_raw")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError) {
        console.error("Error inserting opportunity:", insertError);
        return jsonError("DB_ERROR", `Failed to create opportunity: ${insertError.message}`, 500);
      }

      console.log(`Created opportunity ${inserted.id} with deal_name: ${payload.dealName}`);

      return jsonOk({
        id: inserted.id,
        mode: "create",
        savedFields: insertData,
      });
    }

    // ========== UPDATE MODE ==========
    if (mode === "update") {
      const { opportunityId } = payload;

      if (!opportunityId || typeof opportunityId !== "string" || opportunityId.trim() === "") {
        return jsonError("MISSING_ID", "opportunityId is required for update mode");
      }

      if (!isValidUUID(opportunityId)) {
        return jsonError("INVALID_FORMAT", "opportunityId must be a valid UUID");
      }

      const { data: existing, error: fetchError } = await supabase
        .from("opportunities_raw")
        .select("id")
        .eq("id", opportunityId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching opportunity:", fetchError);
        return jsonError("DB_ERROR", `Database error: ${fetchError.message}`, 500);
      }

      if (!existing) {
        return jsonError("OPPORTUNITY_NOT_FOUND", `No opportunity found with id: ${opportunityId}`, 404);
      }

      const updateData = buildDbObject(payload);

      if (Object.keys(updateData).length === 0) {
        return jsonError("MISSING_FIELDS", "No fields provided to update");
      }

      const { error: updateError } = await supabase
        .from("opportunities_raw")
        .update(updateData)
        .eq("id", opportunityId);

      if (updateError) {
        console.error("Error updating opportunity:", updateError);
        return jsonError("DB_ERROR", `Failed to update opportunity: ${updateError.message}`, 500);
      }

      console.log(`Updated opportunity ${opportunityId} with fields:`, Object.keys(updateData));

      return jsonOk({
        id: opportunityId,
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
