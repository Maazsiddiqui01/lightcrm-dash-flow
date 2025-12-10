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
 * Field Mapping (payload → database):
 *   dealName → deal_name
 *   sector → sector (Insurance normalized to Services)
 *   tier → tier
 *   status → status
 *   headquarters → headquarters
 *   summaryOfOpportunity → summary_of_opportunity
 *   lgTeam → lg_team
 *   lgLead1 → investment_professional_point_person_1
 *   lgLead2 → investment_professional_point_person_2
 *   dealSourceCompany → deal_source_company
 *   dealSourceIndividual1 → deal_source_individual_1
 *   dealSourceIndividual2 → deal_source_individual_2
 *   mostRecentNotes → most_recent_notes
 * 
 * Response (success):
 * {
 *   "ok": true,
 *   "data": {
 *     "id": "uuid",
 *     "mode": "create" | "update",
 *     "savedFields": { ... }
 *   }
 * }
 * 
 * Response (error):
 * {
 *   "ok": false,
 *   "errorCode": "MISSING_FIELDS" | "MISSING_ID" | "OPPORTUNITY_NOT_FOUND" | "UNAUTHORIZED" | "DB_ERROR" | "INVALID_MODE",
 *   "message": "Human readable explanation"
 * }
 * 
 * Tables touched:
 * - opportunities_raw (SELECT for update verification, INSERT for create, UPDATE for update)
 * 
 * Example curl (create):
 * curl -X POST "https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/ai_create_or_update_opportunity" \
 *   -H "Content-Type: application/json" \
 *   -H "x-edge-api-key: your-api-key-here" \
 *   -d '{"mode": "create", "dealName": "Acme Corp Acquisition", "sector": "Industrials", "status": "Active"}'
 * 
 * Example curl (update):
 * curl -X POST "https://wjghdqkxwuyptxzdidtf.supabase.co/functions/v1/ai_create_or_update_opportunity" \
 *   -H "Content-Type: application/json" \
 *   -H "x-edge-api-key: your-api-key-here" \
 *   -d '{"mode": "update", "opportunityId": "uuid-here", "status": "Closed", "mostRecentNotes": "Deal completed"}'
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-edge-api-key",
};

// Valid sector values
type Sector = "Healthcare" | "Industrials" | "Services" | "General";
const VALID_SECTORS: Sector[] = ["Healthcare", "Industrials", "Services", "General"];

// Response helpers
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

// UUID validation
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

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

  if (payload.dealName !== undefined) {
    obj.deal_name = payload.dealName?.trim() || null;
  }
  if (payload.sector !== undefined) {
    obj.sector = normalizeSector(payload.sector);
  }
  if (payload.tier !== undefined) {
    obj.tier = payload.tier?.trim() || null;
  }
  if (payload.status !== undefined) {
    obj.status = payload.status?.trim() || null;
  }
  if (payload.headquarters !== undefined) {
    obj.headquarters = payload.headquarters?.trim() || null;
  }
  if (payload.summaryOfOpportunity !== undefined) {
    obj.summary_of_opportunity = payload.summaryOfOpportunity?.trim() || null;
  }
  if (payload.lgTeam !== undefined) {
    obj.lg_team = payload.lgTeam?.trim() || null;
  }
  if (payload.lgLead1 !== undefined) {
    obj.investment_professional_point_person_1 = payload.lgLead1?.trim() || null;
  }
  if (payload.lgLead2 !== undefined) {
    obj.investment_professional_point_person_2 = payload.lgLead2?.trim() || null;
  }
  if (payload.dealSourceCompany !== undefined) {
    obj.deal_source_company = payload.dealSourceCompany?.trim() || null;
  }
  if (payload.dealSourceIndividual1 !== undefined) {
    obj.deal_source_individual_1 = payload.dealSourceIndividual1?.trim() || null;
  }
  if (payload.dealSourceIndividual2 !== undefined) {
    obj.deal_source_individual_2 = payload.dealSourceIndividual2?.trim() || null;
  }
  if (payload.mostRecentNotes !== undefined) {
    obj.most_recent_notes = payload.mostRecentNotes?.trim() || null;
  }

  return obj;
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
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  // Validate mode
  const { mode } = payload;
  if (!mode || (mode !== "create" && mode !== "update")) {
    return errorResponse("INVALID_MODE", "mode must be 'create' or 'update'");
  }

  // Create Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration");
    return errorResponse("CONFIG_ERROR", "Server configuration error", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ========== CREATE MODE ==========
    if (mode === "create") {
      // Validate required field: dealName
      if (!payload.dealName || typeof payload.dealName !== "string" || payload.dealName.trim() === "") {
        return errorResponse("MISSING_FIELDS", "dealName is required for create mode");
      }

      // Build insert object
      const insertData = buildDbObject(payload);

      // Insert new opportunity
      const { data: inserted, error: insertError } = await supabase
        .from("opportunities_raw")
        .insert(insertData)
        .select("id")
        .single();

      if (insertError) {
        console.error("Error inserting opportunity:", insertError);
        return errorResponse("DB_ERROR", `Failed to create opportunity: ${insertError.message}`, 500);
      }

      console.log(`Created opportunity ${inserted.id} with deal_name: ${payload.dealName}`);

      return successResponse({
        id: inserted.id,
        mode: "create",
        savedFields: insertData,
      });
    }

    // ========== UPDATE MODE ==========
    if (mode === "update") {
      const { opportunityId } = payload;

      // Validate opportunityId
      if (!opportunityId || typeof opportunityId !== "string" || opportunityId.trim() === "") {
        return errorResponse("MISSING_ID", "opportunityId is required for update mode");
      }

      if (!isValidUUID(opportunityId)) {
        return errorResponse("INVALID_FORMAT", "opportunityId must be a valid UUID");
      }

      // Check opportunity exists
      const { data: existing, error: fetchError } = await supabase
        .from("opportunities_raw")
        .select("id")
        .eq("id", opportunityId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching opportunity:", fetchError);
        return errorResponse("DB_ERROR", `Database error: ${fetchError.message}`, 500);
      }

      if (!existing) {
        return errorResponse("OPPORTUNITY_NOT_FOUND", `No opportunity found with id: ${opportunityId}`, 404);
      }

      // Build update object (only fields that are present in payload)
      const updateData = buildDbObject(payload);

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return errorResponse("MISSING_FIELDS", "No fields provided to update");
      }

      // Perform update
      const { error: updateError } = await supabase
        .from("opportunities_raw")
        .update(updateData)
        .eq("id", opportunityId);

      if (updateError) {
        console.error("Error updating opportunity:", updateError);
        return errorResponse("DB_ERROR", `Failed to update opportunity: ${updateError.message}`, 500);
      }

      console.log(`Updated opportunity ${opportunityId} with fields:`, Object.keys(updateData));

      return successResponse({
        id: opportunityId,
        mode: "update",
        savedFields: updateData,
      });
    }

    // Should never reach here due to mode validation above
    return errorResponse("INVALID_MODE", "mode must be 'create' or 'update'");

  } catch (err) {
    console.error("Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return errorResponse("DB_ERROR", `Unexpected error: ${message}`, 500);
  }
});
