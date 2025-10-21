-- Phase 3: Update sync_legacy_group_fields to calculate most_recent_group_contact
DROP FUNCTION IF EXISTS sync_legacy_group_fields() CASCADE;

CREATE OR REPLACE FUNCTION sync_legacy_group_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_first_group RECORD;
  v_group_id uuid;
BEGIN
  -- When a membership is inserted or updated
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Get the group_id for this membership
    v_group_id := NEW.group_id;
    
    -- Get the first group for this contact (ordered by created_at)
    SELECT 
      g.id as group_id,
      g.name as group_name,
      g.max_lag_days,
      g.focus_area,
      g.sector,
      g.notes,
      cgm.email_role
    INTO v_first_group
    FROM contact_group_memberships cgm
    JOIN groups g ON g.id = cgm.group_id
    WHERE cgm.contact_id = NEW.contact_id
    ORDER BY cgm.created_at ASC
    LIMIT 1;
    
    -- Update the legacy fields in contacts_raw
    UPDATE contacts_raw
    SET 
      group_contact = v_first_group.group_name,
      group_delta = v_first_group.max_lag_days,
      group_notes = v_first_group.notes,
      group_sector = v_first_group.sector,
      group_focus_area = v_first_group.focus_area,
      group_email_role = v_first_group.email_role,
      updated_at = now()
    WHERE id = NEW.contact_id;
    
    -- Recalculate most_recent_group_contact for all members of this group
    PERFORM recalculate_group_contact_date(v_group_id);
    
    RETURN NEW;
  END IF;
  
  -- When a membership is deleted
  IF (TG_OP = 'DELETE') THEN
    v_group_id := OLD.group_id;
    
    -- Check if contact has any remaining groups
    SELECT 
      g.id as group_id,
      g.name as group_name,
      g.max_lag_days,
      g.focus_area,
      g.sector,
      g.notes,
      cgm.email_role
    INTO v_first_group
    FROM contact_group_memberships cgm
    JOIN groups g ON g.id = cgm.group_id
    WHERE cgm.contact_id = OLD.contact_id
    ORDER BY cgm.created_at ASC
    LIMIT 1;
    
    -- If no groups remain, clear the legacy fields
    IF v_first_group IS NULL THEN
      UPDATE contacts_raw
      SET 
        group_contact = NULL,
        group_delta = NULL,
        group_notes = NULL,
        group_sector = NULL,
        group_focus_area = NULL,
        group_email_role = NULL,
        most_recent_group_contact = NULL,
        updated_at = now()
      WHERE id = OLD.contact_id;
    ELSE
      -- Update to the next available group
      UPDATE contacts_raw
      SET 
        group_contact = v_first_group.group_name,
        group_delta = v_first_group.max_lag_days,
        group_notes = v_first_group.notes,
        group_sector = v_first_group.sector,
        group_focus_area = v_first_group.focus_area,
        group_email_role = v_first_group.email_role,
        updated_at = now()
      WHERE id = OLD.contact_id;
      
      -- Recalculate for the new group
      PERFORM recalculate_group_contact_date(v_first_group.group_id);
    END IF;
    
    -- Recalculate for the old group
    PERFORM recalculate_group_contact_date(v_group_id);
    
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS sync_legacy_group_fields_trigger ON contact_group_memberships;
CREATE TRIGGER sync_legacy_group_fields_trigger
AFTER INSERT OR UPDATE OR DELETE ON contact_group_memberships
FOR EACH ROW
EXECUTE FUNCTION sync_legacy_group_fields();