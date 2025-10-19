-- Optimize recalculate_group_contact_date function to use most_recent_contact directly
CREATE OR REPLACE FUNCTION public.recalculate_group_contact_date(p_group_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update most_recent_group_contact for all members of the group
  -- to be the MAX of all group members' most_recent_contact
  UPDATE contacts_raw
  SET most_recent_group_contact = (
    SELECT MAX(most_recent_contact)
    FROM contacts_raw
    WHERE group_contact = p_group_name
      AND most_recent_contact IS NOT NULL
  )
  WHERE group_contact = p_group_name;
END;
$function$;