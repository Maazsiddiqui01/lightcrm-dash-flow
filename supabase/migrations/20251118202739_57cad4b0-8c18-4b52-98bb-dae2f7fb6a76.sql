-- Create view for opportunities with computed display fields
CREATE OR REPLACE VIEW opportunities_with_display_fields AS
SELECT 
  o.*,
  COALESCE(
    NULLIF(TRIM(o.next_steps), ''),
    (
      SELECT content 
      FROM opportunity_notes_timeline 
      WHERE opportunity_id = o.id 
        AND field = 'next_steps'
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) as next_steps_display,
  COALESCE(
    NULLIF(TRIM(o.most_recent_notes), ''),
    (
      SELECT content 
      FROM opportunity_notes_timeline 
      WHERE opportunity_id = o.id 
        AND field = 'most_recent_notes'
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) as notes_display,
  -- Also include due date display for next steps
  COALESCE(
    o.next_steps_due_date,
    (
      SELECT due_date 
      FROM opportunity_notes_timeline 
      WHERE opportunity_id = o.id 
        AND field = 'next_steps'
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) as next_steps_due_date_display
FROM opportunities_raw o;

-- Create view for contacts with computed display fields
CREATE OR REPLACE VIEW contacts_with_display_fields AS
SELECT 
  c.*,
  COALESCE(
    NULLIF(TRIM(c.next_steps), ''),
    (
      SELECT content 
      FROM contact_next_steps_timeline 
      WHERE contact_id = c.id 
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) as next_steps_display,
  COALESCE(
    NULLIF(TRIM(c.notes), ''),
    (
      SELECT content 
      FROM contact_notes_timeline 
      WHERE contact_id = c.id 
        AND field = 'notes'
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) as notes_display,
  -- Also include due date display for next steps
  COALESCE(
    c.next_steps_due_date,
    (
      SELECT due_date 
      FROM contact_next_steps_timeline 
      WHERE contact_id = c.id 
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) as next_steps_due_date_display
FROM contacts_raw c;