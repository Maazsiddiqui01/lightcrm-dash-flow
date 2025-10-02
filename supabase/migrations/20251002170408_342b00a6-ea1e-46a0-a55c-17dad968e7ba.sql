-- Create BEFORE trigger to clear most_recent_group_contact when group_contact is removed
CREATE OR REPLACE FUNCTION public.before_contacts_raw_group_clear()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.group_contact IS DISTINCT FROM NEW.group_contact THEN
    -- If group_contact cleared, clear the cached most_recent_group_contact on the row
    IF NEW.group_contact IS NULL OR trim(NEW.group_contact) = '' THEN
      NEW.most_recent_group_contact := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create AFTER trigger to sync group members' most_recent_group_contact
CREATE OR REPLACE FUNCTION public.after_contacts_raw_group_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_group text;
  max_contact_date timestamptz;
BEGIN
  -- Recompute for the old group if a member moved or was removed
  IF TG_OP = 'UPDATE' AND OLD.group_contact IS DISTINCT FROM NEW.group_contact THEN
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
  ELSIF TG_OP = 'DELETE' THEN
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

  -- Recompute for the current/inserted group as well
  IF TG_OP IN ('INSERT','UPDATE') THEN
    target_group := NEW.group_contact;
    IF target_group IS NOT NULL AND trim(target_group) <> '' THEN
      SELECT MAX(most_recent_contact)
        INTO max_contact_date
        FROM public.contacts_raw
       WHERE group_contact = target_group
         AND most_recent_contact IS NOT NULL;

      UPDATE public.contacts_raw
         SET most_recent_group_contact = max_contact_date
       WHERE group_contact = target_group;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop old triggers if they exist and create the new ones
DROP TRIGGER IF EXISTS trg_before_contacts_raw_group_clear ON public.contacts_raw;
CREATE TRIGGER trg_before_contacts_raw_group_clear
BEFORE UPDATE OF group_contact ON public.contacts_raw
FOR EACH ROW EXECUTE FUNCTION public.before_contacts_raw_group_clear();

DROP TRIGGER IF EXISTS trg_after_contacts_raw_group_sync ON public.contacts_raw;
CREATE TRIGGER trg_after_contacts_raw_group_sync
AFTER INSERT OR UPDATE OR DELETE ON public.contacts_raw
FOR EACH ROW EXECUTE FUNCTION public.after_contacts_raw_group_sync();