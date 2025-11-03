-- Add Next Steps columns to contacts_raw table
ALTER TABLE contacts_raw
ADD COLUMN IF NOT EXISTS next_steps TEXT,
ADD COLUMN IF NOT EXISTS next_steps_due_date DATE;

-- Add due_date column to contact_note_events table
ALTER TABLE contact_note_events
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Create contact next steps timeline view
CREATE OR REPLACE VIEW contact_next_steps_timeline AS
SELECT 
  cne.id,
  cne.contact_id,
  cne.field,
  cne.content,
  cne.due_date,
  cne.created_at,
  cne.created_by,
  COALESCE(
    (SELECT (raw_user_meta_data->>'first_name')::text || ' ' || (raw_user_meta_data->>'last_name')::text
     FROM auth.users 
     WHERE id = cne.created_by),
    'Unknown User'
  ) as created_by_name
FROM contact_note_events cne
WHERE cne.field = 'next_steps'
ORDER BY cne.created_at DESC;

-- Create or replace add_contact_note RPC function
CREATE OR REPLACE FUNCTION add_contact_note(
  p_contact_id UUID,
  p_field TEXT,
  p_content TEXT,
  p_due_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_field = 'next_steps' THEN
    UPDATE contacts_raw
    SET next_steps = p_content,
        next_steps_due_date = p_due_date,
        updated_at = NOW()
    WHERE id = p_contact_id;
  ELSIF p_field = 'notes' THEN
    UPDATE contacts_raw
    SET notes = p_content,
        updated_at = NOW()
    WHERE id = p_contact_id;
  END IF;

  -- Log to timeline
  INSERT INTO contact_note_events (
    contact_id,
    field,
    content,
    due_date,
    created_by
  )
  VALUES (
    p_contact_id,
    p_field,
    p_content,
    p_due_date,
    auth.uid()
  );
END;
$$;

-- Update trigger function to log next_steps changes
CREATE OR REPLACE FUNCTION log_contact_note_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Log next_steps changes
    IF NEW.next_steps IS DISTINCT FROM OLD.next_steps 
       AND COALESCE(NEW.next_steps, '') <> '' THEN
      INSERT INTO contact_note_events(contact_id, field, content, due_date, created_by)
      VALUES (NEW.id, 'next_steps', NEW.next_steps, NEW.next_steps_due_date, auth.uid());
    END IF;

    -- Log regular notes changes
    IF NEW.notes IS DISTINCT FROM OLD.notes 
       AND COALESCE(NEW.notes, '') <> '' THEN
      INSERT INTO contact_note_events(contact_id, field, content, created_by)
      VALUES (NEW.id, 'notes', NEW.notes, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;