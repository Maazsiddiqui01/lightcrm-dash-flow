-- Add UPDATE policy for contact_group_memberships table
-- This allows users to update memberships for contacts they own (assigned_to or created_by)

CREATE POLICY "users_update_own_memberships" ON public.contact_group_memberships
  FOR UPDATE USING (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM contacts_raw c 
      WHERE c.id = contact_group_memberships.contact_id 
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  )
  WITH CHECK (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM contacts_raw c 
      WHERE c.id = contact_group_memberships.contact_id 
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  );