import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, requireApiKey, jsonOk, jsonError, handleCors, isValidUUID } from "../_shared/edgeUtils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors();

  const unauthorized = requireApiKey(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const { contactId, content } = body;

    // Validate required fields
    if (!contactId || !content) {
      return jsonError("MISSING_FIELDS", "contactId and content are required", 400);
    }

    if (!isValidUUID(contactId)) {
      return jsonError("INVALID_FORMAT", "contactId must be a valid UUID", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify contact exists
    const { data: contact, error: contactError } = await supabase
      .from("contacts_raw")
      .select("id, full_name")
      .eq("id", contactId)
      .maybeSingle();

    if (contactError) {
      console.error("Error fetching contact:", contactError);
      return jsonError("DB_ERROR", contactError.message, 500);
    }

    if (!contact) {
      return jsonError("CONTACT_NOT_FOUND", `Contact ${contactId} not found`, 404);
    }

    // Insert note event into timeline
    const { data: insertedEvent, error: insertError } = await supabase
      .from("contact_note_events")
      .insert({
        contact_id: contactId,
        field: "notes",
        content: content,
        created_by: null
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting note event:", insertError);
      return jsonError("DB_ERROR", insertError.message, 500);
    }

    // Update contact's notes field
    const { error: updateError } = await supabase
      .from("contacts_raw")
      .update({
        notes: content,
        updated_at: new Date().toISOString()
      })
      .eq("id", contactId);

    if (updateError) {
      console.error("Error updating contact notes:", updateError);
      return jsonError("DB_ERROR", updateError.message, 500);
    }

    console.log(`Added note to contact ${contactId} (${contact.full_name})`);

    return jsonOk({
      insertedEventId: insertedEvent.id,
      contactId,
      notes: content
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("INTERNAL_ERROR", err.message, 500);
  }
});
