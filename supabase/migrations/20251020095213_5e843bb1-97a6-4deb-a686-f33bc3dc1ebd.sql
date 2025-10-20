-- Phase 1: Create groups and contact_group_memberships tables for many-to-many relationships

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  max_lag_days INTEGER,
  focus_area TEXT,
  sector TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  assigned_to UUID
);

-- Create contact_group_memberships junction table
CREATE TABLE IF NOT EXISTS public.contact_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts_raw(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  email_role TEXT CHECK (email_role IN ('to', 'cc', 'bcc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, group_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_group_memberships_contact_id ON public.contact_group_memberships(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_memberships_group_id ON public.contact_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups table
CREATE POLICY "admins_all_groups" ON public.groups
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "users_select_own_groups" ON public.groups
  FOR SELECT USING (
    is_admin(auth.uid()) OR 
    assigned_to = auth.uid() OR 
    created_by = auth.uid()
  );

CREATE POLICY "users_insert_groups" ON public.groups
  FOR INSERT WITH CHECK (
    is_admin(auth.uid()) OR 
    created_by = auth.uid() OR 
    assigned_to = auth.uid()
  );

CREATE POLICY "users_update_own_groups" ON public.groups
  FOR UPDATE USING (
    is_admin(auth.uid()) OR 
    assigned_to = auth.uid() OR 
    created_by = auth.uid()
  )
  WITH CHECK (
    is_admin(auth.uid()) OR 
    assigned_to = auth.uid() OR 
    created_by = auth.uid()
  );

-- RLS Policies for contact_group_memberships table
CREATE POLICY "admins_all_memberships" ON public.contact_group_memberships
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "users_select_own_memberships" ON public.contact_group_memberships
  FOR SELECT USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_group_memberships.contact_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  );

CREATE POLICY "users_insert_memberships" ON public.contact_group_memberships
  FOR INSERT WITH CHECK (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_group_memberships.contact_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  );

CREATE POLICY "users_delete_own_memberships" ON public.contact_group_memberships
  FOR DELETE USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.contacts_raw c
      WHERE c.id = contact_group_memberships.contact_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Migrate existing group data from contacts_raw
INSERT INTO public.groups (name, max_lag_days, focus_area, sector, notes, created_at, created_by, assigned_to)
SELECT DISTINCT
  c.group_contact,
  MAX(c.group_delta),
  (array_agg(c.group_focus_area ORDER BY c.updated_at DESC NULLS LAST) FILTER (WHERE c.group_focus_area IS NOT NULL))[1],
  (array_agg(c.group_sector ORDER BY c.updated_at DESC NULLS LAST) FILTER (WHERE c.group_sector IS NOT NULL))[1],
  (array_agg(c.group_notes ORDER BY c.updated_at DESC NULLS LAST) FILTER (WHERE c.group_notes IS NOT NULL))[1],
  MIN(c.created_at),
  (array_agg(c.created_by ORDER BY c.created_at) FILTER (WHERE c.created_by IS NOT NULL))[1],
  (array_agg(c.assigned_to ORDER BY c.created_at) FILTER (WHERE c.assigned_to IS NOT NULL))[1]
FROM public.contacts_raw c
WHERE c.group_contact IS NOT NULL
GROUP BY c.group_contact
ON CONFLICT (name) DO NOTHING;

-- Migrate existing memberships
INSERT INTO public.contact_group_memberships (contact_id, group_id, email_role)
SELECT 
  c.id,
  g.id,
  c.group_email_role
FROM public.contacts_raw c
INNER JOIN public.groups g ON g.name = c.group_contact
WHERE c.group_contact IS NOT NULL
ON CONFLICT (contact_id, group_id) DO NOTHING;

-- Create RPC to add contact to group
CREATE OR REPLACE FUNCTION public.add_contact_to_group(
  p_contact_id UUID,
  p_group_id UUID,
  p_email_role TEXT DEFAULT 'to'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id UUID;
BEGIN
  -- Check if user has permission
  IF NOT (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM contacts_raw c
      WHERE c.id = p_contact_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Insert or update membership
  INSERT INTO contact_group_memberships (contact_id, group_id, email_role)
  VALUES (p_contact_id, p_group_id, p_email_role)
  ON CONFLICT (contact_id, group_id) 
  DO UPDATE SET email_role = p_email_role
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

-- Create RPC to remove contact from group
CREATE OR REPLACE FUNCTION public.remove_contact_from_group(
  p_contact_id UUID,
  p_group_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has permission
  IF NOT (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM contacts_raw c
      WHERE c.id = p_contact_id
      AND (c.assigned_to = auth.uid() OR c.created_by = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM contact_group_memberships
  WHERE contact_id = p_contact_id AND group_id = p_group_id;

  RETURN FOUND;
END;
$$;

-- Create RPC to get contact's groups
CREATE OR REPLACE FUNCTION public.get_contact_groups(p_contact_id UUID)
RETURNS TABLE(
  group_id UUID,
  group_name TEXT,
  email_role TEXT,
  max_lag_days INTEGER,
  focus_area TEXT,
  sector TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.name,
    cgm.email_role,
    g.max_lag_days,
    g.focus_area,
    g.sector
  FROM contact_group_memberships cgm
  INNER JOIN groups g ON g.id = cgm.group_id
  WHERE cgm.contact_id = p_contact_id
  ORDER BY g.name;
$$;

-- Create RPC to get group members
CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE(
  contact_id UUID,
  full_name TEXT,
  email_address TEXT,
  email_role TEXT,
  organization TEXT,
  title TEXT,
  most_recent_contact TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.full_name,
    c.email_address,
    cgm.email_role,
    c.organization,
    c.title,
    c.most_recent_contact
  FROM contact_group_memberships cgm
  INNER JOIN contacts_raw c ON c.id = cgm.contact_id
  WHERE cgm.group_id = p_group_id
  ORDER BY c.full_name;
$$;

-- Update add_group_note to work with new schema
CREATE OR REPLACE FUNCTION public.add_group_note(
  p_group_name TEXT,
  p_field TEXT,
  p_content TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Get group ID
  SELECT id INTO v_group_id
  FROM groups
  WHERE name = p_group_name;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Group not found: %', p_group_name;
  END IF;

  -- Update group notes
  UPDATE groups
  SET 
    notes = p_content,
    updated_at = now()
  WHERE id = v_group_id;
  
  -- Insert into timeline
  INSERT INTO group_note_events (
    group_name,
    field,
    content,
    created_by
  )
  VALUES (
    p_group_name,
    p_field,
    p_content,
    auth.uid()
  );

  -- Also update legacy group_notes on all member contacts for backward compatibility
  UPDATE contacts_raw
  SET 
    group_notes = p_content,
    updated_at = now()
  WHERE id IN (
    SELECT contact_id 
    FROM contact_group_memberships 
    WHERE group_id = v_group_id
  );
END;
$$;

-- Create trigger to update groups updated_at
CREATE OR REPLACE FUNCTION public.update_groups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_groups_updated_at();