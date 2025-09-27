-- Drop the existing outreach_date column 
ALTER TABLE public.contacts_raw 
DROP COLUMN IF EXISTS outreach_date;

-- Add outreach_date as a regular column
ALTER TABLE public.contacts_raw 
ADD COLUMN outreach_date timestamp with time zone;

-- Create function to calculate outreach_date
CREATE OR REPLACE FUNCTION public.calculate_outreach_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate outreach_date = most_recent_contact + delta days
  -- Only set if both most_recent_contact and delta are not null and delta > 0
  IF NEW.most_recent_contact IS NOT NULL 
     AND NEW.delta IS NOT NULL 
     AND NEW.delta > 0 THEN
    NEW.outreach_date := NEW.most_recent_contact + (NEW.delta * interval '1 day');
  ELSE
    NEW.outreach_date := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update outreach_date
CREATE TRIGGER trg_calculate_outreach_date
  BEFORE INSERT OR UPDATE OF most_recent_contact, delta ON public.contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_outreach_date();

-- Update existing records to populate outreach_date
UPDATE public.contacts_raw 
SET most_recent_contact = most_recent_contact
WHERE most_recent_contact IS NOT NULL OR delta IS NOT NULL;