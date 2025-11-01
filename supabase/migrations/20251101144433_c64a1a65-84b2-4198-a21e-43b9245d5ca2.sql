-- Enable RLS on articles table (policies already exist)
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on contacts_dismissed_emails and add policies
ALTER TABLE public.contacts_dismissed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view dismissed emails"
ON public.contacts_dismissed_emails FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can insert dismissed emails"
ON public.contacts_dismissed_emails FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin can update dismissed emails"
ON public.contacts_dismissed_emails FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete dismissed emails"
ON public.contacts_dismissed_emails FOR DELETE
USING (public.is_admin(auth.uid()));

-- Enable RLS on focus_area_description and add policies
ALTER TABLE public.focus_area_description ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view focus area descriptions"
ON public.focus_area_description FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert focus area descriptions"
ON public.focus_area_description FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin can update focus area descriptions"
ON public.focus_area_description FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can delete focus area descriptions"
ON public.focus_area_description FOR DELETE
USING (public.is_admin(auth.uid()));

-- Enable RLS on opportunity_note_events and add policies
ALTER TABLE public.opportunity_note_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for their opportunities"
ON public.opportunity_note_events FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM opportunities_raw o
    WHERE o.id = opportunity_note_events.opportunity_id
    AND (o.assigned_to = auth.uid() OR o.created_by = auth.uid())
  )
);

CREATE POLICY "Users can insert notes for their opportunities"
ON public.opportunity_note_events FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM opportunities_raw o
    WHERE o.id = opportunity_note_events.opportunity_id
    AND (o.assigned_to = auth.uid() OR o.created_by = auth.uid())
  )
);

-- Enable RLS on lg_focus_area_master and add policies
ALTER TABLE public.lg_focus_area_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view focus area master"
ON public.lg_focus_area_master FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage focus area master"
ON public.lg_focus_area_master FOR ALL
USING (public.is_admin(auth.uid()));

-- Enable RLS on group_note_events (found to be missing RLS)
ALTER TABLE public.group_note_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group notes"
ON public.group_note_events FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.name = group_note_events.group_name
    AND (g.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM contact_group_memberships cgm
      JOIN contacts_raw c ON c.id = cgm.contact_id
      WHERE cgm.group_id = g.id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    ))
  )
);

CREATE POLICY "Users can insert group notes"
ON public.group_note_events FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.name = group_note_events.group_name
    AND (g.created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM contact_group_memberships cgm
      JOIN contacts_raw c ON c.id = cgm.contact_id
      WHERE cgm.group_id = g.id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    ))
  )
);