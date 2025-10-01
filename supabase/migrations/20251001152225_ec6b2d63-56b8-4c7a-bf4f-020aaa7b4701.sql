-- Clean up trailing spaces in delta_type column
UPDATE contacts_raw
SET delta_type = TRIM(delta_type)
WHERE delta_type IS NOT NULL AND delta_type != TRIM(delta_type);

-- Also clean up any other text columns that might have trailing spaces
UPDATE contacts_raw
SET 
  full_name = TRIM(full_name),
  organization = TRIM(organization),
  title = TRIM(title),
  category = TRIM(category),
  contact_type = TRIM(contact_type),
  lg_sector = TRIM(lg_sector)
WHERE 
  (full_name IS NOT NULL AND full_name != TRIM(full_name)) OR
  (organization IS NOT NULL AND organization != TRIM(organization)) OR
  (title IS NOT NULL AND title != TRIM(title)) OR
  (category IS NOT NULL AND category != TRIM(category)) OR
  (contact_type IS NOT NULL AND contact_type != TRIM(contact_type)) OR
  (lg_sector IS NOT NULL AND lg_sector != TRIM(lg_sector));

-- Create a function to automatically trim text values on insert/update
CREATE OR REPLACE FUNCTION trim_text_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'contacts_raw' THEN
    NEW.full_name = TRIM(COALESCE(NEW.full_name, ''));
    NEW.organization = TRIM(COALESCE(NEW.organization, ''));
    NEW.title = TRIM(COALESCE(NEW.title, ''));
    NEW.category = TRIM(COALESCE(NEW.category, ''));
    NEW.contact_type = TRIM(COALESCE(NEW.contact_type, ''));
    NEW.delta_type = TRIM(COALESCE(NEW.delta_type, ''));
    NEW.lg_sector = TRIM(COALESCE(NEW.lg_sector, ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically trim on insert/update
DROP TRIGGER IF EXISTS trim_contacts_text_columns ON contacts_raw;
CREATE TRIGGER trim_contacts_text_columns
BEFORE INSERT OR UPDATE ON contacts_raw
FOR EACH ROW
EXECUTE FUNCTION trim_text_columns();

-- Do the same for opportunities_raw table
UPDATE opportunities_raw
SET 
  deal_name = TRIM(deal_name),
  sector = TRIM(sector),
  lg_focus_area = TRIM(lg_focus_area),
  platform_add_on = TRIM(platform_add_on),
  tier = TRIM(tier),
  status = TRIM(status),
  ownership_type = TRIM(ownership_type)
WHERE 
  (deal_name IS NOT NULL AND deal_name != TRIM(deal_name)) OR
  (sector IS NOT NULL AND sector != TRIM(sector)) OR
  (lg_focus_area IS NOT NULL AND lg_focus_area != TRIM(lg_focus_area)) OR
  (platform_add_on IS NOT NULL AND platform_add_on != TRIM(platform_add_on)) OR
  (tier IS NOT NULL AND tier != TRIM(tier)) OR
  (status IS NOT NULL AND status != TRIM(status)) OR
  (ownership_type IS NOT NULL AND ownership_type != TRIM(ownership_type));

-- Update the trim function to also handle opportunities_raw
CREATE OR REPLACE FUNCTION trim_text_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'contacts_raw' THEN
    NEW.full_name = NULLIF(TRIM(COALESCE(NEW.full_name, '')), '');
    NEW.organization = NULLIF(TRIM(COALESCE(NEW.organization, '')), '');
    NEW.title = NULLIF(TRIM(COALESCE(NEW.title, '')), '');
    NEW.category = NULLIF(TRIM(COALESCE(NEW.category, '')), '');
    NEW.contact_type = NULLIF(TRIM(COALESCE(NEW.contact_type, '')), '');
    NEW.delta_type = NULLIF(TRIM(COALESCE(NEW.delta_type, '')), '');
    NEW.lg_sector = NULLIF(TRIM(COALESCE(NEW.lg_sector, '')), '');
  ELSIF TG_TABLE_NAME = 'opportunities_raw' THEN
    NEW.deal_name = NULLIF(TRIM(COALESCE(NEW.deal_name, '')), '');
    NEW.sector = NULLIF(TRIM(COALESCE(NEW.sector, '')), '');
    NEW.lg_focus_area = NULLIF(TRIM(COALESCE(NEW.lg_focus_area, '')), '');
    NEW.platform_add_on = NULLIF(TRIM(COALESCE(NEW.platform_add_on, '')), '');
    NEW.tier = NULLIF(TRIM(COALESCE(NEW.tier, '')), '');
    NEW.status = NULLIF(TRIM(COALESCE(NEW.status, '')), '');
    NEW.ownership_type = NULLIF(TRIM(COALESCE(NEW.ownership_type, '')), '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for opportunities_raw
DROP TRIGGER IF EXISTS trim_opportunities_text_columns ON opportunities_raw;
CREATE TRIGGER trim_opportunities_text_columns
BEFORE INSERT OR UPDATE ON opportunities_raw
FOR EACH ROW
EXECUTE FUNCTION trim_text_columns();