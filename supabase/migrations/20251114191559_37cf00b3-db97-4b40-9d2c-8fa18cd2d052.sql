-- Fix 1: Recreate contact_notes_timeline view to include id column
DROP VIEW IF EXISTS public.contact_notes_timeline;

CREATE VIEW public.contact_notes_timeline AS
SELECT 
  id,
  contact_id,
  field,
  content,
  created_at,
  created_by
FROM contact_note_events
ORDER BY created_at DESC;

-- Fix 2: Clean up duplicate RLS policies on opportunity_note_events
-- Remove duplicate INSERT policies (keeping the most restrictive one)
DROP POLICY IF EXISTS "insert notes" ON public.opportunity_note_events;
DROP POLICY IF EXISTS "Users can insert notes for their opportunities" ON public.opportunity_note_events;

-- Remove duplicate SELECT policies (keeping the most restrictive one)
DROP POLICY IF EXISTS "read notes" ON public.opportunity_note_events;
DROP POLICY IF EXISTS "Users can view notes for their opportunities" ON public.opportunity_note_events;