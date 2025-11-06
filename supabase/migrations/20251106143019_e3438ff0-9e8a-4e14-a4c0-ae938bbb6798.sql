-- Make email_address nullable since we now use contact_email_addresses table
ALTER TABLE public.contacts_raw 
ALTER COLUMN email_address DROP NOT NULL;

-- Create add_contact_note RPC function
CREATE OR REPLACE FUNCTION public.add_contact_note(
  p_contact_id uuid,
  p_field text,
  p_content text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update only the specific field being changed (never touch email_address)
  IF p_field = 'notes' THEN
    UPDATE contacts_raw
    SET notes = p_content, updated_at = now()
    WHERE id = p_contact_id;
  ELSIF p_field = 'next_steps' THEN
    UPDATE contacts_raw
    SET next_steps = p_content, updated_at = now()
    WHERE id = p_contact_id;
  ELSE
    RAISE EXCEPTION 'Invalid field: %', p_field;
  END IF;
  
  -- Log to timeline if content is not empty
  IF p_content IS NOT NULL AND trim(p_content) != '' THEN
    INSERT INTO contact_note_events(contact_id, field, content, created_by)
    VALUES (p_contact_id, p_field, p_content, auth.uid());
  END IF;
END;
$$;

-- Add comment explaining why email_address is nullable
COMMENT ON COLUMN public.contacts_raw.email_address IS 
  'Primary email address. Nullable because emails are now managed in contact_email_addresses table. At least one email should exist in contact_email_addresses for each contact.';