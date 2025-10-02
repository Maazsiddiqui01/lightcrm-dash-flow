-- Fix trigger to clear most_recent_group_contact when removing contact from group
CREATE OR REPLACE FUNCTION public.update_group_contact_dates()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  target_group text;
  max_contact_date timestamp with time zone;
BEGIN
  -- Handle case where group_contact was cleared - clear most_recent_group_contact
  IF TG_OP = 'UPDATE' AND OLD.group_contact IS DISTINCT FROM NEW.group_contact THEN
    -- Clear most_recent_group_contact if group_contact is now empty
    IF NEW.group_contact IS NULL OR trim(NEW.group_contact) = '' THEN
      NEW.most_recent_group_contact := NULL;
    END IF;
    
    -- Update the old group members' most_recent_group_contact if contact was removed from a group
    IF OLD.group_contact IS NOT NULL AND trim(OLD.group_contact) <> '' THEN
      SELECT MAX(most_recent_contact)
      INTO max_contact_date
      FROM public.contacts_raw
      WHERE group_contact = OLD.group_contact
        AND id != NEW.id  -- Exclude the contact being updated
        AND most_recent_contact IS NOT NULL;

      UPDATE public.contacts_raw
      SET most_recent_group_contact = max_contact_date
      WHERE group_contact = OLD.group_contact
        AND id != NEW.id;  -- Don't update the contact being removed
    END IF;
  END IF;

  -- Determine which group to update (for INSERT or UPDATE with group assigned)
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

  RETURN NEW;
END;
$function$;