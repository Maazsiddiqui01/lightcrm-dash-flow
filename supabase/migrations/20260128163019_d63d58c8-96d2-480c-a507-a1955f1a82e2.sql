-- Drop the view and recreate with optimized JOINs
DROP VIEW IF EXISTS contacts_with_display_fields CASCADE;

-- Recreate with optimized JOINs instead of correlated subqueries
-- This changes O(n*3) subqueries to O(1) single query with JOINs
CREATE VIEW contacts_with_display_fields AS
WITH 
  -- Get the most recent next_steps entry for each contact
  latest_next_steps AS (
    SELECT DISTINCT ON (contact_id) 
      contact_id,
      content as latest_next_steps_content,
      due_date as latest_next_steps_due_date
    FROM contact_next_steps_timeline
    ORDER BY contact_id, created_at DESC
  ),
  -- Get the most recent notes entry for each contact  
  latest_notes AS (
    SELECT DISTINCT ON (contact_id)
      contact_id,
      content as latest_notes_content
    FROM contact_notes_timeline
    WHERE field = 'notes'
    ORDER BY contact_id, created_at DESC
  )
SELECT 
  c.*,
  COALESCE(
    NULLIF(TRIM(c.next_steps), ''),
    lns.latest_next_steps_content
  ) as next_steps_display,
  COALESCE(
    NULLIF(TRIM(c.notes), ''),
    ln.latest_notes_content
  ) as notes_display,
  COALESCE(
    c.next_steps_due_date,
    lns.latest_next_steps_due_date
  ) as next_steps_due_date_display
FROM contacts_raw c
LEFT JOIN latest_next_steps lns ON lns.contact_id = c.id
LEFT JOIN latest_notes ln ON ln.contact_id = c.id;