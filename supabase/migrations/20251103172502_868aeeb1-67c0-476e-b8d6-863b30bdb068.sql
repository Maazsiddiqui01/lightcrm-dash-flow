-- Fix duplicate timeline entries by removing explicit INSERT from add_contact_note
-- The trigger log_contact_note_changes will handle all timeline logging

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
  -- Only UPDATE the contacts_raw table
  -- The trigger log_contact_note_changes will handle logging to timeline automatically
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
  
  -- Removed explicit INSERT to contact_note_events
  -- The trigger handles this automatically, preventing duplicates
END;
$$;