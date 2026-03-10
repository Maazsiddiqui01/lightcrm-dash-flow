
-- 1. Fix John Lanza's stale email
UPDATE public.contacts_raw
SET email_address = 'john.lanza@cantor.com', updated_at = now()
WHERE id = '611607f0-1a38-419e-999f-6391290452c6';

-- 2. Create trigger function to sync primary email changes
CREATE OR REPLACE FUNCTION public.sync_primary_email_to_contacts_raw()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE contacts_raw
    SET email_address = NEW.email_address,
        updated_at = now()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER trg_sync_primary_email
  AFTER INSERT OR UPDATE OF is_primary, email_address
  ON public.contact_email_addresses
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION public.sync_primary_email_to_contacts_raw();
