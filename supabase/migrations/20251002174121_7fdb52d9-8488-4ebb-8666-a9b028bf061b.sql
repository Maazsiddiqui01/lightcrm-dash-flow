-- Phase 1: Database Cleanup & Trigger Consolidation

-- Step 1.1: Remove old conflicting trigger and function
DROP TRIGGER IF EXISTS trg_update_group_contact_dates ON public.contacts_raw;
DROP FUNCTION IF EXISTS public.update_group_contact_dates();

-- Step 1.2: Update BEFORE trigger to normalize empty strings to NULL
CREATE OR REPLACE FUNCTION public.before_contacts_raw_group_clear()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize empty strings to NULL for group_contact
  IF NEW.group_contact IS NOT NULL AND trim(NEW.group_contact) = '' THEN
    NEW.group_contact := NULL;
  END IF;
  
  -- If group_contact is being cleared, also clear most_recent_group_contact
  IF TG_OP = 'UPDATE' AND OLD.group_contact IS DISTINCT FROM NEW.group_contact THEN
    IF NEW.group_contact IS NULL THEN
      NEW.most_recent_group_contact := NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 1.3: Data Cleanup - Convert empty strings to NULL and clear orphaned values
UPDATE public.contacts_raw 
SET group_contact = NULL 
WHERE group_contact IS NOT NULL AND trim(group_contact) = '';

-- Clear orphaned most_recent_group_contact values where group_contact is NULL
UPDATE public.contacts_raw 
SET most_recent_group_contact = NULL 
WHERE group_contact IS NULL AND most_recent_group_contact IS NOT NULL;

-- Add index for better performance on group queries
CREATE INDEX IF NOT EXISTS idx_contacts_raw_group_contact ON public.contacts_raw(group_contact) WHERE group_contact IS NOT NULL;