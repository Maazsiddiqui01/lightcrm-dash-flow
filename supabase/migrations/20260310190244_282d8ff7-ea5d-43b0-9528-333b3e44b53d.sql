
-- Fix 7 non-conflicting mismatched emails (excluding those that would violate unique constraint)
UPDATE public.contacts_raw c
SET email_address = cea.email_address, updated_at = now()
FROM public.contact_email_addresses cea
WHERE cea.contact_id = c.id
  AND cea.is_primary = true
  AND lower(trim(c.email_address)) IS DISTINCT FROM lower(trim(cea.email_address))
  AND NOT EXISTS (
    SELECT 1 FROM public.contacts_raw other
    WHERE lower(other.email_address) = lower(cea.email_address)
      AND other.id != c.id
  );
