-- Update the calculate_outreach_date function to use the higher of most_recent_contact or most_recent_group_contact
CREATE OR REPLACE FUNCTION public.calculate_outreach_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate outreach_date = MAX(most_recent_contact, most_recent_group_contact) + delta days
  -- Only set if delta > 0 and at least one contact date exists
  IF NEW.delta IS NOT NULL AND NEW.delta > 0 THEN
    -- Get the higher of the two dates
    DECLARE
      effective_contact_date timestamp with time zone;
    BEGIN
      effective_contact_date := GREATEST(
        COALESCE(NEW.most_recent_contact, '1900-01-01'::timestamp with time zone),
        COALESCE(NEW.most_recent_group_contact, '1900-01-01'::timestamp with time zone)
      );
      
      -- Only set outreach_date if we have a real contact date (not the fallback)
      IF effective_contact_date > '1900-01-01'::timestamp with time zone THEN
        NEW.outreach_date := effective_contact_date + (NEW.delta * interval '1 day');
      ELSE
        NEW.outreach_date := NULL;
      END IF;
    END;
  ELSE
    NEW.outreach_date := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;