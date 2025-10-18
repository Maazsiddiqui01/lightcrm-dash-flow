-- Grant SELECT permissions on opportunity_notes_timeline view to authenticated and anon roles
-- This allows users to query the timeline view while RLS on the underlying opportunity_note_events table
-- still enforces proper data access control

GRANT SELECT ON opportunity_notes_timeline TO authenticated;
GRANT SELECT ON opportunity_notes_timeline TO anon;