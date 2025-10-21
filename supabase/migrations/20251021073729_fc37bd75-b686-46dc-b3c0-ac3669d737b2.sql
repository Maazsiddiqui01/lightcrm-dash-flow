-- Function to sync legacy group fields in contacts_raw when memberships change
CREATE OR REPLACE FUNCTION sync_legacy_group_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_first_group RECORD;
BEGIN
  -- When a membership is inserted or updated
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Get the first group for this contact (ordered by created_at)
    SELECT 
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
    
    RETURN NEW;
  END IF;
  
  -- When a membership is deleted
  IF (TG_OP = 'DELETE') THEN
    -- Check if contact has any remaining groups
    SELECT 
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
    END IF;
    
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contact_group_memberships
DROP TRIGGER IF EXISTS sync_legacy_group_fields_trigger ON contact_group_memberships;
CREATE TRIGGER sync_legacy_group_fields_trigger
AFTER INSERT OR UPDATE OR DELETE ON contact_group_memberships
FOR EACH ROW
EXECUTE FUNCTION sync_legacy_group_fields();

-- Backfill legacy group fields for existing memberships
UPDATE contacts_raw c
SET 
  group_contact = first_group.group_name,
  group_delta = first_group.max_lag_days,
  group_notes = first_group.notes,
  group_sector = first_group.sector,
  group_focus_area = first_group.focus_area,
  group_email_role = first_group.email_role,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (cgm.contact_id)
    cgm.contact_id,
    g.name as group_name,
    g.max_lag_days,
    g.focus_area,
    g.sector,
    g.notes,
    cgm.email_role
  FROM contact_group_memberships cgm
  JOIN groups g ON g.id = cgm.group_id
  ORDER BY cgm.contact_id, cgm.created_at ASC
) first_group
WHERE c.id = first_group.contact_id;