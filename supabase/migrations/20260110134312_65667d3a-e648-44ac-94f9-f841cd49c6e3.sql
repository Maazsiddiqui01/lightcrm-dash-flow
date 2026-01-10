-- Create table to store the timeline of notes/next steps entries for horizons
CREATE TABLE horizon_note_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('company', 'gp')),
  field TEXT NOT NULL CHECK (field IN ('notes', 'next_steps')),
  content TEXT NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_horizon_note_events_record ON horizon_note_events(record_id, record_type);
CREATE INDEX idx_horizon_note_events_field ON horizon_note_events(field);
CREATE INDEX idx_horizon_note_events_created_at ON horizon_note_events(created_at DESC);

-- RLS Policies
ALTER TABLE horizon_note_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view horizon note events" ON horizon_note_events FOR SELECT USING (true);
CREATE POLICY "Users can insert horizon note events" ON horizon_note_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete horizon note events" ON horizon_note_events FOR DELETE USING (true);

-- Create view for timeline display
CREATE VIEW horizon_notes_timeline AS
SELECT 
  id,
  record_id,
  record_type,
  field,
  content,
  due_date,
  created_at,
  created_by
FROM horizon_note_events
ORDER BY created_at DESC;

-- Add due date columns to company and GP tables
ALTER TABLE lg_horizons_companies ADD COLUMN IF NOT EXISTS next_steps_due_date DATE;
ALTER TABLE lg_horizons_gps ADD COLUMN IF NOT EXISTS next_steps_due_date DATE;

-- Create RPC function for adding notes with date prepending
CREATE OR REPLACE FUNCTION add_horizon_note(
  p_record_id UUID,
  p_record_type TEXT,
  p_field TEXT,
  p_content TEXT,
  p_due_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date TEXT;
  v_formatted_content TEXT;
BEGIN
  -- Prepend today's date to content
  v_current_date := to_char(now(), 'YYYY-MM-DD');
  v_formatted_content := v_current_date || ': ' || p_content;
  
  -- Insert into note events for timeline
  INSERT INTO horizon_note_events (record_id, record_type, field, content, due_date, created_by)
  VALUES (p_record_id, p_record_type, p_field, v_formatted_content, p_due_date, auth.uid());
  
  -- Update the main table based on record type
  IF p_record_type = 'company' THEN
    UPDATE lg_horizons_companies
    SET 
      notes = CASE WHEN p_field = 'notes' THEN v_formatted_content ELSE notes END,
      next_steps = CASE WHEN p_field = 'next_steps' THEN v_formatted_content ELSE next_steps END,
      next_steps_due_date = CASE WHEN p_field = 'next_steps' THEN p_due_date ELSE next_steps_due_date END,
      updated_at = now()
    WHERE id = p_record_id;
  ELSIF p_record_type = 'gp' THEN
    UPDATE lg_horizons_gps
    SET 
      notes = CASE WHEN p_field = 'notes' THEN v_formatted_content ELSE notes END,
      next_steps = CASE WHEN p_field = 'next_steps' THEN v_formatted_content ELSE next_steps END,
      next_steps_due_date = CASE WHEN p_field = 'next_steps' THEN p_due_date ELSE next_steps_due_date END,
      updated_at = now()
    WHERE id = p_record_id;
  END IF;
END;
$$;