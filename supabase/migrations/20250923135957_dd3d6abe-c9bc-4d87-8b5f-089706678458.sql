-- Create trigger function to log contact note changes
CREATE OR REPLACE FUNCTION public.log_contact_note_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.notes is distinct from old.notes and coalesce(new.notes,'') <> '' then
      insert into contact_note_events(contact_id, field, content, created_by)
      values (new.id, 'notes', new.notes, auth.uid());
    end if;
  end if;
  return new;
end$function$

-- Create trigger on contacts_raw to automatically log note changes
CREATE TRIGGER log_contact_notes_trigger
  AFTER UPDATE ON public.contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.log_contact_note_changes();