-- Fix duplicate note entries by removing direct insert from RPC function
-- Let the trigger handle all note logging for consistency

CREATE OR REPLACE FUNCTION public.add_contact_note(p_contact_id uuid, p_field text, p_content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update the current field in contacts_raw
  -- The trigger will handle logging to contact_note_events
  IF p_field = 'notes' THEN
    UPDATE contacts_raw
    SET notes = p_content, updated_at = now()
    WHERE id = p_contact_id;
  END IF;
END$function$;