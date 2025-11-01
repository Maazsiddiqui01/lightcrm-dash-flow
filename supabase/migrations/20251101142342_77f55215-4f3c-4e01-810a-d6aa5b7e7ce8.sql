-- Add new columns to contacts_raw for follow-up scheduling
-- First, add the regular columns
ALTER TABLE contacts_raw
ADD COLUMN follow_up_days INTEGER DEFAULT NULL,
ADD COLUMN follow_up_recency_threshold INTEGER DEFAULT 15;

-- Create an immutable function to calculate follow_up_date
CREATE OR REPLACE FUNCTION calculate_follow_up_date(
  p_follow_up_days INTEGER,
  p_most_recent_contact TIMESTAMP WITH TIME ZONE,
  p_follow_up_recency_threshold INTEGER
) RETURNS DATE AS $$
BEGIN
  -- Guardrail 1: Blank if follow_up_days is 0 or NULL
  IF p_follow_up_days IS NULL OR p_follow_up_days = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Guardrail 2: Blank if most_recent_contact is NULL
  IF p_most_recent_contact IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Guardrail 3: Blank if most_recent_contact is older than threshold
  -- Note: We can't use CURRENT_DATE in immutable function, so we'll handle this in a trigger
  IF p_most_recent_contact < (NOW() - (COALESCE(p_follow_up_recency_threshold, 15) || ' days')::INTERVAL) THEN
    RETURN NULL;
  END IF;
  
  -- Calculate: most_recent_contact + follow_up_days
  RETURN (p_most_recent_contact::date + p_follow_up_days);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add the follow_up_date column as a regular column (not generated)
ALTER TABLE contacts_raw
ADD COLUMN follow_up_date DATE DEFAULT NULL;

-- Create index for efficient filtering/sorting by follow_up_date
CREATE INDEX idx_contacts_follow_up_date ON contacts_raw(follow_up_date) 
WHERE follow_up_date IS NOT NULL;

-- Create index for follow_up_days for analytics
CREATE INDEX idx_contacts_follow_up_days ON contacts_raw(follow_up_days) 
WHERE follow_up_days IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN contacts_raw.follow_up_days IS 
'Number of days after most_recent_contact to schedule follow-up. Set to 0 to disable follow-up for this contact.';

COMMENT ON COLUMN contacts_raw.follow_up_recency_threshold IS 
'Maximum age (in days) of most_recent_contact for follow-up to be scheduled. Default: 15 days.';

COMMENT ON COLUMN contacts_raw.follow_up_date IS 
'Auto-calculated: most_recent_contact + follow_up_days. NULL if contact is too old, follow-up disabled, or date is in past.';

-- Trigger function to recalculate follow_up_date whenever relevant fields change
CREATE OR REPLACE FUNCTION recalculate_follow_up_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate follow_up_date
  NEW.follow_up_date := (
    CASE
      -- Guardrail 1: Blank if follow_up_days is 0 or NULL
      WHEN NEW.follow_up_days IS NULL OR NEW.follow_up_days = 0 THEN NULL
      
      -- Guardrail 2: Blank if most_recent_contact is NULL
      WHEN NEW.most_recent_contact IS NULL THEN NULL
      
      -- Guardrail 3: Blank if most_recent_contact is older than threshold
      WHEN NEW.most_recent_contact < (CURRENT_DATE - (COALESCE(NEW.follow_up_recency_threshold, 15) || ' days')::INTERVAL) THEN NULL
      
      -- Guardrail 4: Blank if calculated follow-up date is in the past
      WHEN (NEW.most_recent_contact::date + NEW.follow_up_days) < CURRENT_DATE THEN NULL
      
      -- Otherwise, calculate: most_recent_contact + follow_up_days
      ELSE (NEW.most_recent_contact::date + NEW.follow_up_days)
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_follow_up_date
  BEFORE INSERT OR UPDATE OF follow_up_days, follow_up_recency_threshold, most_recent_contact 
  ON contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_follow_up_date();

-- Set default follow_up_days = 7 for contacts with recent activity
UPDATE contacts_raw
SET follow_up_days = 7
WHERE most_recent_contact IS NOT NULL
  AND most_recent_contact >= (CURRENT_DATE - INTERVAL '15 days')
  AND follow_up_days IS NULL;

-- Set follow_up_days = 0 for contacts with intentional_no_outreach = true
UPDATE contacts_raw
SET follow_up_days = 0
WHERE intentional_no_outreach = true
  AND follow_up_days IS NULL;

-- Trigger: Auto-set follow_up_days when intentional_no_outreach changes
CREATE OR REPLACE FUNCTION sync_follow_up_with_intentional_no_outreach()
RETURNS TRIGGER AS $$
BEGIN
  -- When intentional_no_outreach is set to TRUE, set follow_up_days to 0
  IF NEW.intentional_no_outreach = true AND OLD.intentional_no_outreach IS DISTINCT FROM true THEN
    NEW.follow_up_days := 0;
  END IF;
  
  -- When intentional_no_outreach is cleared AND follow_up_days is 0, reset to default
  IF NEW.intentional_no_outreach = false AND OLD.intentional_no_outreach = true AND NEW.follow_up_days = 0 THEN
    NEW.follow_up_days := 7;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_intentional_no_outreach_change
  BEFORE UPDATE OF intentional_no_outreach ON contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION sync_follow_up_with_intentional_no_outreach();

-- Trigger: Auto-set follow_up_days when most_recent_contact updates
CREATE OR REPLACE FUNCTION auto_set_follow_up_days_on_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- When most_recent_contact is updated and becomes recent
  IF NEW.most_recent_contact IS DISTINCT FROM OLD.most_recent_contact THEN
    -- If contact is recent and follow_up_days is NULL, set default
    IF NEW.most_recent_contact >= (CURRENT_DATE - (COALESCE(NEW.follow_up_recency_threshold, 15) || ' days')::INTERVAL)
       AND NEW.follow_up_days IS NULL 
       AND COALESCE(NEW.intentional_no_outreach, false) = false THEN
      NEW.follow_up_days := 7;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_contact_recency_update_follow_up
  BEFORE UPDATE OF most_recent_contact ON contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_follow_up_days_on_contact();

-- Log the migration
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM contacts_raw
  WHERE follow_up_days IS NOT NULL;
  
  RAISE NOTICE 'Follow-up days initialized for % contacts', updated_count;
END $$;