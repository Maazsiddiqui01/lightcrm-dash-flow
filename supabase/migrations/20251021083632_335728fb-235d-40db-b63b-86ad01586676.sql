-- Phase 4: Backfill most_recent_group_contact for existing data
DO $$
DECLARE
  v_group_id uuid;
  v_count integer := 0;
BEGIN
  -- Recalculate most_recent_group_contact for all existing groups
  FOR v_group_id IN 
    SELECT DISTINCT id FROM groups
  LOOP
    PERFORM recalculate_group_contact_date(v_group_id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled most_recent_group_contact for % groups', v_count;
END $$;