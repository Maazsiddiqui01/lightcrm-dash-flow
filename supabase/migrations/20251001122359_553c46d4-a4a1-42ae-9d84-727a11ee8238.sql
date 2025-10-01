-- Ensure the calculate_outreach_date trigger exists on contacts_raw table
-- This will automatically update outreach_date whenever most_recent_contact or delta changes

-- First, drop the trigger if it exists to recreate it
DROP TRIGGER IF EXISTS trg_calculate_outreach_date ON public.contacts_raw;

-- Create the trigger that fires BEFORE INSERT OR UPDATE
CREATE TRIGGER trg_calculate_outreach_date
  BEFORE INSERT OR UPDATE OF most_recent_contact, delta
  ON public.contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_outreach_date();