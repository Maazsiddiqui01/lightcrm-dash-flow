-- Fix duplicate note events by relying on the UPDATE trigger only
-- Remove explicit INSERT from add_opportunity_note to avoid double-logging
CREATE OR REPLACE FUNCTION public.add_opportunity_note(p_opportunity_id uuid, p_field text, p_content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update the current field in opportunities_raw; the trigger trg_log_opportunity_note_changes
  -- on opportunities_raw will write a single row into opportunity_note_events.
  IF p_field = 'next_steps' THEN
    UPDATE opportunities_raw
    SET next_steps = p_content, updated_at = now()
    WHERE id = p_opportunity_id;
  ELSIF p_field = 'most_recent_notes' THEN
    UPDATE opportunities_raw
    SET most_recent_notes = p_content, updated_at = now()
    WHERE id = p_opportunity_id;
  END IF;
END
$function$;