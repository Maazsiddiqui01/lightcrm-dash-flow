-- Add RPC function to search contacts for a group (excluding existing members)
CREATE OR REPLACE FUNCTION search_contacts_for_group(
  p_search_term TEXT,
  p_exclude_group_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email_address TEXT,
  organization TEXT,
  title TEXT,
  most_recent_contact TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.full_name,
    c.email_address,
    c.organization,
    c.title,
    c.most_recent_contact
  FROM contacts_raw c
  WHERE 
    -- Not already in the group
    NOT EXISTS (
      SELECT 1 FROM contact_group_memberships cgm
      WHERE cgm.contact_id = c.id AND cgm.group_id = p_exclude_group_id
    )
    -- Match search term
    AND (
      p_search_term IS NULL OR
      c.full_name ILIKE '%' || p_search_term || '%' OR
      c.email_address ILIKE '%' || p_search_term || '%' OR
      c.organization ILIKE '%' || p_search_term || '%'
    )
  ORDER BY c.full_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to recalculate group dates when membership changes
CREATE OR REPLACE FUNCTION trigger_recalculate_group_date()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For INSERT/UPDATE, recalculate for the new group_id
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    PERFORM recalculate_group_contact_date(NEW.group_id);
  END IF;
  
  -- For DELETE/UPDATE, recalculate for the old group_id
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    PERFORM recalculate_group_contact_date(OLD.group_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to contact_group_memberships
DROP TRIGGER IF EXISTS after_membership_change ON contact_group_memberships;
CREATE TRIGGER after_membership_change
  AFTER INSERT OR UPDATE OR DELETE ON contact_group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_group_date();

-- Trigger to recalculate group dates when contact recency changes
CREATE OR REPLACE FUNCTION trigger_recalculate_all_contact_groups()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find all groups this contact belongs to and recalculate each
  PERFORM recalculate_group_contact_date(cgm.group_id)
  FROM contact_group_memberships cgm
  WHERE cgm.contact_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to contacts_raw (only when most_recent_contact changes)
DROP TRIGGER IF EXISTS after_contact_recency_update ON contacts_raw;
CREATE TRIGGER after_contact_recency_update
  AFTER UPDATE OF most_recent_contact ON contacts_raw
  FOR EACH ROW
  WHEN (OLD.most_recent_contact IS DISTINCT FROM NEW.most_recent_contact)
  EXECUTE FUNCTION trigger_recalculate_all_contact_groups();