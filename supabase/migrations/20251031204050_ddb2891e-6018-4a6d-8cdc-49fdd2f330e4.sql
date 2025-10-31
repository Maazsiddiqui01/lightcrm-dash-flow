-- Function to refresh contacts after interaction changes
CREATE OR REPLACE FUNCTION public.trigger_refresh_contacts_after_interaction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- For INSERT/UPDATE with email data
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.emails_arr IS NOT NULL AND array_length(NEW.emails_arr, 1) > 0 THEN
    PERFORM public.refresh_contacts_by_emails(NEW.emails_arr);
  END IF;
  
  -- For DELETE, try to extract emails from OLD record
  IF TG_OP = 'DELETE' AND OLD.emails_arr IS NOT NULL AND array_length(OLD.emails_arr, 1) > 0 THEN
    PERFORM public.refresh_contacts_by_emails(OLD.emails_arr);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger (fires AFTER operation completes)
DROP TRIGGER IF EXISTS after_interaction_change ON public.emails_meetings_raw;
CREATE TRIGGER after_interaction_change
  AFTER INSERT OR UPDATE OR DELETE
  ON public.emails_meetings_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_contacts_after_interaction();

-- Function optimized for bulk refresh after CSV imports
CREATE OR REPLACE FUNCTION public.refresh_all_contacts_from_interactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_emails text[];
  updated_count integer := 0;
BEGIN
  -- Get all unique emails from interactions table
  SELECT ARRAY_AGG(DISTINCT email)
  INTO affected_emails
  FROM (
    SELECT UNNEST(emails_arr) as email
    FROM public.emails_meetings_raw
    WHERE emails_arr IS NOT NULL
  ) subq
  WHERE email IS NOT NULL AND email != '';
  
  -- Refresh contacts with those emails
  IF affected_emails IS NOT NULL AND array_length(affected_emails, 1) > 0 THEN
    PERFORM public.refresh_contacts_by_emails(affected_emails);
    
    -- Count how many contacts were updated
    SELECT COUNT(*)::int INTO updated_count
    FROM public.contacts_raw
    WHERE lower(email_address) = ANY(affected_emails);
  END IF;
  
  RETURN updated_count;
END;
$$;