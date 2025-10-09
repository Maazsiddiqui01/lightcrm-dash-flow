-- Critical fix: Set ownership for opportunities with NULL created_by/assigned_to
-- This allows non-admin users to see opportunities per RLS policies

DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Find the first admin user
  SELECT user_id INTO v_admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;
  
  -- If we found an admin, assign all NULL records to them
  IF v_admin_id IS NOT NULL THEN
    UPDATE public.opportunities_raw
    SET 
      created_by = COALESCE(created_by, v_admin_id),
      assigned_to = COALESCE(assigned_to, v_admin_id),
      updated_at = now()
    WHERE created_by IS NULL OR assigned_to IS NULL;
    
    RAISE NOTICE 'Updated opportunities with admin user: %', v_admin_id;
  ELSE
    -- If no admin found, just log a warning
    RAISE WARNING 'No admin user found. Opportunities ownership not updated.';
  END IF;
END $$;

-- Ensure the trigger is attached to opportunities_raw for future inserts
DROP TRIGGER IF EXISTS set_created_by_opportunities ON public.opportunities_raw;
CREATE TRIGGER set_created_by_opportunities
  BEFORE INSERT ON public.opportunities_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();