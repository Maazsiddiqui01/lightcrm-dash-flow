-- ============================================================================
-- PHASE 1: CREATE DATABASE TRIGGERS FOR GROUP MAX_LAG_DAYS SYNCHRONIZATION
-- ============================================================================

-- 1. Function to sync max_lag_days from groups to all member contacts
CREATE OR REPLACE FUNCTION public.sync_group_max_lag_to_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a group's max_lag_days is updated, sync to all member contacts
  IF NEW.max_lag_days IS DISTINCT FROM OLD.max_lag_days THEN
    UPDATE contacts_raw
    SET 
      group_delta = NEW.max_lag_days,
      updated_at = now()
    WHERE id IN (
      SELECT contact_id 
      FROM contact_group_memberships 
      WHERE group_id = NEW.id
    );
    
    RAISE NOTICE 'Synced max_lag_days=% to % members of group %', 
      NEW.max_lag_days, 
      (SELECT COUNT(*) FROM contact_group_memberships WHERE group_id = NEW.id),
      NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Trigger on groups table
DROP TRIGGER IF EXISTS sync_group_max_lag_to_contacts ON public.groups;
CREATE TRIGGER sync_group_max_lag_to_contacts
AFTER UPDATE OF max_lag_days ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.sync_group_max_lag_to_members();

-- 3. Function to sync contact's group_delta when membership changes
CREATE OR REPLACE FUNCTION public.sync_contact_group_delta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_lag_days integer;
  v_contact_id uuid;
BEGIN
  -- Determine the contact ID based on operation
  IF TG_OP = 'INSERT' THEN
    v_contact_id := NEW.contact_id;
    
    -- Get the group's max_lag_days
    SELECT max_lag_days INTO v_max_lag_days
    FROM groups
    WHERE id = NEW.group_id;
    
    -- Update the contact's group_delta
    UPDATE contacts_raw
    SET 
      group_delta = v_max_lag_days,
      updated_at = now()
    WHERE id = v_contact_id;
    
    RAISE NOTICE 'Set group_delta=% for contact % (added to group)', v_max_lag_days, v_contact_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_contact_id := OLD.contact_id;
    
    -- Check if contact still belongs to other groups
    SELECT g.max_lag_days INTO v_max_lag_days
    FROM contact_group_memberships cgm
    JOIN groups g ON g.id = cgm.group_id
    WHERE cgm.contact_id = v_contact_id
    LIMIT 1;
    
    -- If no other groups, set group_delta to NULL, otherwise use first remaining group
    UPDATE contacts_raw
    SET 
      group_delta = v_max_lag_days,
      updated_at = now()
    WHERE id = v_contact_id;
    
    RAISE NOTICE 'Updated group_delta=% for contact % (removed from group)', v_max_lag_days, v_contact_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Trigger on contact_group_memberships table
DROP TRIGGER IF EXISTS sync_member_group_delta ON public.contact_group_memberships;
CREATE TRIGGER sync_member_group_delta
AFTER INSERT OR DELETE ON public.contact_group_memberships
FOR EACH ROW
EXECUTE FUNCTION public.sync_contact_group_delta();

-- 5. Backfill existing data to sync current group members
UPDATE contacts_raw c
SET group_delta = g.max_lag_days
FROM contact_group_memberships cgm
JOIN groups g ON g.id = cgm.group_id
WHERE c.id = cgm.contact_id
  AND c.group_delta IS DISTINCT FROM g.max_lag_days;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.sync_group_max_lag_to_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_contact_group_delta() TO authenticated;

-- 7. Create indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_cgm_contact_id ON contact_group_memberships(contact_id);
CREATE INDEX IF NOT EXISTS idx_cgm_group_id ON contact_group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_max_lag_days ON groups(max_lag_days) WHERE max_lag_days IS NOT NULL;