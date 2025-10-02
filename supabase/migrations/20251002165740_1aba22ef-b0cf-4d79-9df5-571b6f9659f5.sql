-- Clear most_recent_group_contact for contacts without a group_contact
UPDATE public.contacts_raw
SET most_recent_group_contact = NULL
WHERE (group_contact IS NULL OR trim(group_contact) = '')
  AND most_recent_group_contact IS NOT NULL;