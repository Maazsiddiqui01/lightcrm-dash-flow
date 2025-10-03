-- Phase 2: Add User Assignment Columns
-- This adds assignment tracking without breaking existing data (all nullable)

-- Add assignment columns to contacts_raw
ALTER TABLE public.contacts_raw 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add assignment columns to opportunities_raw
ALTER TABLE public.opportunities_raw 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add created_by to interactions
ALTER TABLE public.emails_meetings_raw 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Create function to auto-set created_by on INSERT
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set created_by if not already set and user is authenticated
  IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  -- Auto-assign to creator if no assignment set
  IF TG_TABLE_NAME IN ('contacts_raw', 'opportunities_raw') 
     AND NEW.assigned_to IS NULL 
     AND auth.uid() IS NOT NULL THEN
    NEW.assigned_to := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to contacts_raw
DROP TRIGGER IF EXISTS set_created_by_contacts ON public.contacts_raw;
CREATE TRIGGER set_created_by_contacts
  BEFORE INSERT ON public.contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();

-- Apply trigger to opportunities_raw
DROP TRIGGER IF EXISTS set_created_by_opportunities ON public.opportunities_raw;
CREATE TRIGGER set_created_by_opportunities
  BEFORE INSERT ON public.opportunities_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();

-- Apply trigger to emails_meetings_raw
DROP TRIGGER IF EXISTS set_created_by_interactions ON public.emails_meetings_raw;
CREATE TRIGGER set_created_by_interactions
  BEFORE INSERT ON public.emails_meetings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON public.contacts_raw(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON public.contacts_raw(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to ON public.opportunities_raw(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON public.opportunities_raw(created_by);
CREATE INDEX IF NOT EXISTS idx_interactions_created_by ON public.emails_meetings_raw(created_by);

-- Optionally backfill existing records to current user (only if you want)
-- Uncommented for now - we can do this later if needed
-- UPDATE public.contacts_raw SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
-- UPDATE public.opportunities_raw SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;