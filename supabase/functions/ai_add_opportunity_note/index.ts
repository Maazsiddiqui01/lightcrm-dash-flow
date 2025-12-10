import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, requireApiKey, jsonOk, jsonError, handleCors, isValidUUID } from "../_shared/edgeUtils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  const unauthorized = requireApiKey(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { opportunityId, content } = body;

    // Validate required fields
    if (!opportunityId || !content) {
      return jsonError("MISSING_FIELDS", "opportunityId and content are required", 400);
    }

    if (!isValidUUID(opportunityId)) {
      return jsonError("INVALID_FORMAT", "opportunityId must be a valid UUID", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify opportunity exists
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities_raw")
      .select("id, deal_name")
      .eq("id", opportunityId)
      .maybeSingle();

    if (oppError) {
      console.error("Error fetching opportunity:", oppError);
      return jsonError("DB_ERROR", oppError.message, 500);
    }

    if (!opportunity) {
      return jsonError("OPPORTUNITY_NOT_FOUND", `Opportunity ${opportunityId} not found`, 404);
    }

    // Insert note event into timeline
    const { data: insertedEvent, error: insertError } = await supabase
      .from("opportunity_note_events")
      .insert({
        opportunity_id: opportunityId,
        field: "most_recent_notes",
        content: content,
        created_by: null
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting note event:", insertError);
      return jsonError("DB_ERROR", insertError.message, 500);
    }

    // Update opportunity's most_recent_notes field
    const { error: updateError } = await supabase
      .from("opportunities_raw")
      .update({
        most_recent_notes: content,
        updated_at: new Date().toISOString()
      })
      .eq("id", opportunityId);

    if (updateError) {
      console.error("Error updating opportunity notes:", updateError);
      return jsonError("DB_ERROR", updateError.message, 500);
    }

    console.log(`Added note to opportunity ${opportunityId} (${opportunity.deal_name})`);

    return jsonOk({
      insertedEventId: insertedEvent.id,
      opportunityId,
      mostRecentNotes: content
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("INTERNAL_ERROR", err.message, 500);
  }
});
