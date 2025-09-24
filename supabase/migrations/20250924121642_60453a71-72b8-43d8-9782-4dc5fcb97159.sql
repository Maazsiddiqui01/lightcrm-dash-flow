-- Add due_date support to opportunity notes system

-- Add due_date column to opportunity_note_events table
ALTER TABLE public.opportunity_note_events 
ADD COLUMN due_date DATE;

-- Add due_date column to opportunities_raw table for current next steps due date
ALTER TABLE public.opportunities_raw 
ADD COLUMN next_steps_due_date DATE;

-- Update add_opportunity_note function to accept optional due_date parameter
CREATE OR REPLACE FUNCTION public.add_opportunity_note(
  p_opportunity_id uuid, 
  p_field text, 
  p_content text,
  p_due_date date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update the current field in opportunities_raw; the trigger will handle logging
  IF p_field = 'next_steps' THEN
    UPDATE opportunities_raw
    SET next_steps = p_content, 
        next_steps_due_date = p_due_date,
        updated_at = now()
    WHERE id = p_opportunity_id;
  ELSIF p_field = 'most_recent_notes' THEN
    UPDATE opportunities_raw
    SET most_recent_notes = p_content, 
        updated_at = now()
    WHERE id = p_opportunity_id;
  END IF;
END
$function$;

-- Update log_opportunity_note_changes trigger to capture due_date
CREATE OR REPLACE FUNCTION public.log_opportunity_note_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.next_steps is distinct from old.next_steps and coalesce(new.next_steps,'') <> '' then
      insert into opportunity_note_events(opportunity_id, field, content, due_date, created_by)
      values (new.id, 'next_steps', new.next_steps, new.next_steps_due_date, auth.uid());
    end if;

    if new.most_recent_notes is distinct from old.most_recent_notes and coalesce(new.most_recent_notes,'') <> '' then
      insert into opportunity_note_events(opportunity_id, field, content, created_by)
      values (new.id, 'most_recent_notes', new.most_recent_notes, auth.uid());
    end if;
  end if;
  return new;
end
$function$;