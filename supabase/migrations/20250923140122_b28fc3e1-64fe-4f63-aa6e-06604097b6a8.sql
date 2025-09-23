-- Create trigger on contacts_raw to automatically log note changes
CREATE TRIGGER log_contact_notes_trigger
  AFTER UPDATE ON public.contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.log_contact_note_changes();