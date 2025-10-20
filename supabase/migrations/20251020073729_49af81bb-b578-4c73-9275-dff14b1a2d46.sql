-- Add group focus area and group sector columns to contacts_raw table
ALTER TABLE public.contacts_raw 
ADD COLUMN IF NOT EXISTS group_focus_area text,
ADD COLUMN IF NOT EXISTS group_sector text;

-- Add comments for documentation
COMMENT ON COLUMN public.contacts_raw.group_focus_area IS 'Focus area designation for contacts in a group';
COMMENT ON COLUMN public.contacts_raw.group_sector IS 'Sector designation for contacts in a group';