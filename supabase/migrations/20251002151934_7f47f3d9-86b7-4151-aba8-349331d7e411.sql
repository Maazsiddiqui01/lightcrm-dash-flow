-- Add most_recent_group_contact column to contacts_raw
ALTER TABLE public.contacts_raw 
ADD COLUMN most_recent_group_contact timestamp with time zone;

-- Create function to update group contact dates
CREATE OR REPLACE FUNCTION public.update_group_contact_dates()
RETURNS TRIGGER AS $$
DECLARE
  target_group text;
  max_contact_date timestamp with time zone;
BEGIN
  -- Determine which group to update
  IF TG_OP = 'DELETE' THEN
    target_group := OLD.group_contact;
  ELSE
    target_group := NEW.group_contact;
  END IF;

  -- Only process if there's a group assigned
  IF target_group IS NOT NULL AND trim(target_group) <> '' THEN
    -- Find the most recent contact date in this group
    SELECT MAX(most_recent_contact)
    INTO max_contact_date
    FROM public.contacts_raw
    WHERE group_contact = target_group
      AND most_recent_contact IS NOT NULL;

    -- Update all members of this group
    UPDATE public.contacts_raw
    SET most_recent_group_contact = max_contact_date
    WHERE group_contact = target_group;
  END IF;

  -- Handle case where group_contact was cleared
  IF TG_OP = 'UPDATE' AND OLD.group_contact IS DISTINCT FROM NEW.group_contact THEN
    -- Clear most_recent_group_contact if group_contact is now empty
    IF NEW.group_contact IS NULL OR trim(NEW.group_contact) = '' THEN
      NEW.most_recent_group_contact := NULL;
    END IF;
    
    -- Also update the old group if it exists
    IF OLD.group_contact IS NOT NULL AND trim(OLD.group_contact) <> '' THEN
      SELECT MAX(most_recent_contact)
      INTO max_contact_date
      FROM public.contacts_raw
      WHERE group_contact = OLD.group_contact
        AND most_recent_contact IS NOT NULL;

      UPDATE public.contacts_raw
      SET most_recent_group_contact = max_contact_date
      WHERE group_contact = OLD.group_contact;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update group contact dates
DROP TRIGGER IF EXISTS trg_update_group_contact_dates ON public.contacts_raw;
CREATE TRIGGER trg_update_group_contact_dates
  AFTER INSERT OR UPDATE OF most_recent_contact, group_contact OR DELETE
  ON public.contacts_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_contact_dates();

-- Initial population: calculate for existing groups
UPDATE public.contacts_raw c1
SET most_recent_group_contact = (
  SELECT MAX(c2.most_recent_contact)
  FROM public.contacts_raw c2
  WHERE c2.group_contact = c1.group_contact
    AND c2.group_contact IS NOT NULL
    AND trim(c2.group_contact) <> ''
    AND c2.most_recent_contact IS NOT NULL
)
WHERE c1.group_contact IS NOT NULL 
  AND trim(c1.group_contact) <> '';