-- Drop and recreate the opportunity_notes_timeline view to include due_date
DROP VIEW IF EXISTS public.opportunity_notes_timeline;

CREATE VIEW public.opportunity_notes_timeline AS
SELECT 
  one.id,
  one.opportunity_id,
  one.field,
  one.content, 
  one.due_date,
  one.created_at,
  one.created_by
FROM opportunity_note_events one
ORDER BY one.created_at DESC;