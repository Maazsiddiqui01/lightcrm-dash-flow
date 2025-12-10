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
 *   "opportunityId"?: "uuid",              // Required for update
 *   "dealName": "string",                  // Required for create
 *   "sector"?: "Healthcare" | "Industrials" | "Services" | "General",
 *   "tier"?: "string",
 *   "status"?: "string",
 *   "headquarters"?: "string | null",
 *   "summaryOfOpportunity"?: "string | null",
 *   "lgTeam"?: "string | null",
 *   "lgLead1"?: "string | null",
 *   "lgLead2"?: "string | null",
 *   "dealSourceCompany"?: "string | null",
 *   "dealSourceIndividual1"?: "string | null",
 *   "dealSourceIndividual2"?: "string | null",
 *   "mostRecentNotes"?: "string | null"
 * }
 * 
 * Field Mapping: dealName→deal_name, sector→sector (Insurance→Services), etc.
 * 
 * Response (success): { "ok": true, "data": { id, mode, savedFields } }
 * Response (error): { "ok": false, "errorCode": "...", "message": "..." }
 * 
 * Example curl (create):
 * curl -X POST "https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/ai_create_or_update_opportunity" \
 *   -H "Content-Type: application/json" \
 *   -H "x-edge-api-key: your-api-key-here" \
 *   -d '{"mode": "create", "dealName": "Acme Corp", "sector": "Industrials", "status": "Active"}'
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
  dealName?: string;
  sector?: string;
  tier?: string;
  status?: string;
  headquarters?: string | null;
  summaryOfOpportunity?: string | null;
  lgTeam?: string | null;
  lgLead1?: string | null;
  lgLead2?: string | null;
  dealSourceCompany?: string | null;
  dealSourceIndividual1?: string | null;
  dealSourceIndividual2?: string | null;
  mostRecentNotes?: string | null;
}

// Build database object from payload (only include defined fields)
function buildDbObject(payload: Payload): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  if (payload.dealName !== undefined) obj.deal_name = payload.dealName?.trim() || null;
  if (payload.sector !== undefined) obj.sector = normalizeSector(payload.sector);
  if (payload.tier !== undefined) obj.tier = payload.tier?.trim() || null;
  if (payload.status !== undefined) obj.status = payload.status?.trim() || null;
  if (payload.headquarters !== undefined) obj.headquarters = payload.headquarters?.trim() || null;
  if (payload.summaryOfOpportunity !== undefined) obj.summary_of_opportunity = payload.summaryOfOpportunity?.trim() || null;
  if (payload.lgTeam !== undefined) obj.lg_team = payload.lgTeam?.trim() || null;
  if (payload.lgLead1 !== undefined) obj.investment_professional_point_person_1 = payload.lgLead1?.trim() || null;
  if (payload.lgLead2 !== undefined) obj.investment_professional_point_person_2 = payload.lgLead2?.trim() || null;
  if (payload.dealSourceCompany !== undefined) obj.deal_source_company = payload.dealSourceCompany?.trim() || null;
  if (payload.dealSourceIndividual1 !== undefined) obj.deal_source_individual_1 = payload.dealSourceIndividual1?.trim() || null;
  if (payload.dealSourceIndividual2 !== undefined) obj.deal_source_individual_2 = payload.dealSourceIndividual2?.trim() || null;
  if (payload.mostRecentNotes !== undefined) obj.most_recent_notes = payload.mostRecentNotes?.trim() || null;

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
