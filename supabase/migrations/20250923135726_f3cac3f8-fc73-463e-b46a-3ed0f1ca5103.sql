-- Create contact_note_events table to store all contact note entries
CREATE TABLE public.contact_note_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL,
  field TEXT NOT NULL DEFAULT 'notes',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.contact_note_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_note_events
CREATE POLICY "read contact notes" ON public.contact_note_events
  FOR SELECT USING (true);

CREATE POLICY "insert contact notes" ON public.contact_note_events
  FOR INSERT WITH CHECK (true);

-- Create contact_notes_timeline view
CREATE VIEW public.contact_notes_timeline AS
SELECT 
  contact_id,
  field,
  content,
  created_at,
  created_by
FROM public.contact_note_events
ORDER BY created_at DESC;