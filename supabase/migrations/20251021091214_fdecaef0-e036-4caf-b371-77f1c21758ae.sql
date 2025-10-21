-- Phase 1: Add DELETE RLS Policy for groups table
CREATE POLICY "users_delete_own_groups" ON public.groups
FOR DELETE
TO public
USING (
  public.is_admin(auth.uid()) 
  OR created_by = auth.uid() 
  OR assigned_to = auth.uid()
);

-- Phase 4: Add cleanup trigger for deleted groups
CREATE OR REPLACE FUNCTION public.cleanup_deleted_group_references()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a group is deleted, nullify most_recent_group_contact for all former members
  -- who are no longer in any groups
  UPDATE contacts_raw
  SET 
    most_recent_group_contact = NULL,
    updated_at = now()
  WHERE group_contact = OLD.name
    AND NOT EXISTS (
      SELECT 1 FROM contact_group_memberships cgm
      WHERE cgm.contact_id = contacts_raw.id
    );
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER cleanup_deleted_group_trigger
BEFORE DELETE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_deleted_group_references();