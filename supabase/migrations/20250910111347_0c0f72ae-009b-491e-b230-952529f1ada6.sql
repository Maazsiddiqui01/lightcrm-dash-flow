-- Create RPC function for adding opportunity notes
CREATE OR REPLACE FUNCTION add_opportunity_note(
  p_opportunity_id uuid,
  p_field text,
  p_content text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert into the events table
  INSERT INTO opportunity_note_events(opportunity_id, field, content, created_by)
  VALUES (p_opportunity_id, p_field, p_content, auth.uid());

  -- Update the current field in opportunities_raw
  IF p_field = 'next_steps' THEN
    UPDATE opportunities_raw
    SET next_steps = p_content, updated_at = now()
    WHERE id = p_opportunity_id;
  ELSIF p_field = 'most_recent_notes' THEN
    UPDATE opportunities_raw
    SET most_recent_notes = p_content, updated_at = now()
    WHERE id = p_opportunity_id;
  END IF;
END$$;