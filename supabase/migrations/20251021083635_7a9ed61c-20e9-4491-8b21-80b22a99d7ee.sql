-- Phase 5: Drop legacy view and ensure clean state
DROP VIEW IF EXISTS group_contacts_view CASCADE;

-- Ensure the RPC function is the single source of truth
COMMENT ON FUNCTION get_group_contacts_view() IS 'Primary interface for group contacts data. Uses new groups + contact_group_memberships schema.';

-- Log cleanup
DO $$
BEGIN
  RAISE NOTICE 'Cleanup complete: Legacy group_contacts_view dropped. RPC function is now the single source of truth.';
END $$;