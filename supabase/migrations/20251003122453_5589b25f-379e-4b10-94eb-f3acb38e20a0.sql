
-- Fix: Deal Notes and Next Steps Could Be Stolen by Competitors
-- Restrict opportunity_note_events access to only users who have access to the parent opportunity

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "insert contact notes" ON public.opportunity_note_events;
DROP POLICY IF EXISTS "read contact notes" ON public.opportunity_note_events;

-- Create secure policies that check parent opportunity access
-- Admins can see all notes
CREATE POLICY "admins_all_opportunity_notes"
ON public.opportunity_note_events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Users can only see notes for opportunities they own or are assigned to
CREATE POLICY "users_select_own_opportunity_notes"
ON public.opportunity_note_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.opportunities_raw o
    WHERE o.id = opportunity_note_events.opportunity_id
      AND (o.assigned_to = auth.uid() OR o.created_by = auth.uid())
  )
);

-- Users can insert notes for opportunities they own or are assigned to
CREATE POLICY "users_insert_own_opportunity_notes"
ON public.opportunity_note_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.opportunities_raw o
    WHERE o.id = opportunity_note_events.opportunity_id
      AND (o.assigned_to = auth.uid() OR o.created_by = auth.uid())
  )
);
