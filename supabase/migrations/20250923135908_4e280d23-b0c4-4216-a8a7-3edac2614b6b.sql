-- Create add_contact_note RPC function
CREATE OR REPLACE FUNCTION public.add_contact_note(p_contact_id uuid, p_field text, p_content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert into the events table
  INSERT INTO contact_note_events(contact_id, field, content, created_by)
  VALUES (p_contact_id, p_field, p_content, auth.uid());

  -- Update the current field in contacts_raw
  IF p_field = 'notes' THEN
    UPDATE contacts_raw
    SET notes = p_content, updated_at = now()
    WHERE id = p_contact_id;
  END IF;
END$function$