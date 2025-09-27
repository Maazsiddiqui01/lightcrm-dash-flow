-- Check if outreach_date column exists and trigger is working
-- Update existing records to populate outreach_date using the trigger
UPDATE public.contacts_raw 
SET delta = delta
WHERE delta IS NOT NULL;