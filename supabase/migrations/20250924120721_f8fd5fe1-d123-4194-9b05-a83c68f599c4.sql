-- Fix opportunity_notes_timeline view to include id field
DROP VIEW IF EXISTS opportunity_notes_timeline;

CREATE VIEW opportunity_notes_timeline AS
SELECT 
    id,
    opportunity_id,
    field,
    content,
    created_at,
    created_by
FROM opportunity_note_events e
ORDER BY created_at DESC;