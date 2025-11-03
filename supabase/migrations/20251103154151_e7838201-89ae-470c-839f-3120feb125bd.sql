-- Clean up stale group_contact references in contacts
UPDATE contacts_raw
SET group_contact = NULL,
    updated_at = NOW()
WHERE group_contact IS NOT NULL
  AND group_contact != ''
  AND NOT EXISTS (
    SELECT 1 FROM contact_group_memberships cgm WHERE cgm.contact_id = contacts_raw.id
  );