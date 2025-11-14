-- Add DELETE policies for contact_note_events
CREATE POLICY "users_delete_own_contact_notes"
ON public.contact_note_events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contacts_raw c
    WHERE c.id = contact_note_events.contact_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
  )
);

-- Add DELETE policies for opportunity_note_events
CREATE POLICY "users_delete_own_opportunity_notes"
ON public.opportunity_note_events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.opportunities_raw o
    WHERE o.id = opportunity_note_events.opportunity_id
      AND (o.assigned_to = auth.uid() OR o.created_by = auth.uid())
  )
);