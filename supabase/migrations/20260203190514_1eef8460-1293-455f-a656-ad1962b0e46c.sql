-- Fix duplicate timeline entries by adding deduplication logic to the trigger
CREATE OR REPLACE FUNCTION public.log_opportunity_note_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  if tg_op = 'UPDATE' then
    -- Check for next_steps changes
    if new.next_steps is distinct from old.next_steps 
       and coalesce(new.next_steps,'') <> '' then
      -- Prevent duplicates within 5 second window
      IF NOT EXISTS (
        SELECT 1 FROM opportunity_note_events 
        WHERE opportunity_id = NEW.id 
          AND field = 'next_steps' 
          AND content = NEW.next_steps
          AND created_at > (now() - interval '5 seconds')
      ) THEN
        insert into opportunity_note_events(opportunity_id, field, content, due_date, created_by)
        values (new.id, 'next_steps', new.next_steps, new.next_steps_due_date, auth.uid());
      END IF;
    end if;

    -- Check for most_recent_notes changes
    if new.most_recent_notes is distinct from old.most_recent_notes 
       and coalesce(new.most_recent_notes,'') <> '' then
      -- Prevent duplicates within 5 second window
      IF NOT EXISTS (
        SELECT 1 FROM opportunity_note_events 
        WHERE opportunity_id = NEW.id 
          AND field = 'most_recent_notes' 
          AND content = NEW.most_recent_notes
          AND created_at > (now() - interval '5 seconds')
      ) THEN
        insert into opportunity_note_events(opportunity_id, field, content, created_by)
        values (new.id, 'most_recent_notes', new.most_recent_notes, auth.uid());
      END IF;
    end if;
  end if;
  return new;
end
$function$;