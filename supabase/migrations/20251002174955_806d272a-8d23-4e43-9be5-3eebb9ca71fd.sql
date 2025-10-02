-- Comprehensive fix for Group Contact recursion and data consistency
-- 1) BEFORE trigger function to normalize input and clear fields on removal
CREATE OR REPLACE FUNCTION public.before_contacts_raw_group_clear()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize empty strings to NULL for group_contact
  IF NEW.group_contact IS NOT NULL AND trim(NEW.group_contact) = '' THEN
    NEW.group_contact := NULL;
  END IF;

  -- If group_contact is being cleared, also clear most_recent_group_contact on the row
  IF TG_OP = 'UPDATE' AND OLD.group_contact IS DISTINCT FROM NEW.group_contact THEN
    IF NEW.group_contact IS NULL THEN
      NEW.most_recent_group_contact := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure BEFORE trigger is attached only when group_contact is touched
DROP TRIGGER IF EXISTS trg_before_contacts_raw_group_clear ON public.contacts_raw;
CREATE TRIGGER trg_before_contacts_raw_group_clear
BEFORE INSERT OR UPDATE OF group_contact ON public.contacts_raw
FOR EACH ROW
EXECUTE FUNCTION public.before_contacts_raw_group_clear();

-- 2) AFTER trigger function to recompute most_recent_group_contact without recursion
CREATE OR REPLACE FUNCTION public.after_contacts_raw_group_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_group text;
  v_new_group text;
BEGIN
  -- Guard against recursive updates caused by this trigger's own UPDATE
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Recompute for the old group if a member moved or was removed
  IF TG_OP IN ('UPDATE','DELETE') THEN
    v_old_group := NULLIF(trim(COALESCE(OLD.group_contact, '')), '');
    IF v_old_group IS NOT NULL THEN
      WITH agg AS (
        SELECT group_contact, MAX(most_recent_contact) AS max_date
        FROM public.contacts_raw
        WHERE group_contact = v_old_group
        GROUP BY group_contact
      )
      UPDATE public.contacts_raw c
      SET most_recent_group_contact = a.max_date
      FROM agg a
      WHERE c.group_contact = a.group_contact
        AND (c.most_recent_group_contact IS DISTINCT FROM a.max_date);
    END IF;
  END IF;

  -- Recompute for the current/inserted group
  IF TG_OP IN ('INSERT','UPDATE') THEN
    v_new_group := NULLIF(trim(COALESCE(NEW.group_contact, '')), '');
    IF v_new_group IS NOT NULL THEN
      WITH agg AS (
        SELECT group_contact, MAX(most_recent_contact) AS max_date
        FROM public.contacts_raw
        WHERE group_contact = v_new_group
        GROUP BY group_contact
      )
      UPDATE public.contacts_raw c
      SET most_recent_group_contact = a.max_date
      FROM agg a
      WHERE c.group_contact = a.group_contact
        AND (c.most_recent_group_contact IS DISTINCT FROM a.max_date);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Recreate AFTER trigger with precise firing conditions
DROP TRIGGER IF EXISTS trg_after_contacts_raw_group_sync ON public.contacts_raw;
CREATE TRIGGER trg_after_contacts_raw_group_sync
AFTER INSERT OR UPDATE OF group_contact, most_recent_contact OR DELETE ON public.contacts_raw
FOR EACH ROW
EXECUTE FUNCTION public.after_contacts_raw_group_sync();

-- 3) Data cleanup and backfill to ensure consistent state
-- Normalize empty string groups to NULL
UPDATE public.contacts_raw
SET group_contact = NULL
WHERE group_contact IS NOT NULL AND trim(group_contact) = '';

-- Clear orphaned most_recent_group_contact when no group
UPDATE public.contacts_raw
SET most_recent_group_contact = NULL
WHERE group_contact IS NULL AND most_recent_group_contact IS NOT NULL;

-- Backfill most_recent_group_contact for all existing groups
WITH agg AS (
  SELECT group_contact, MAX(most_recent_contact) AS max_date
  FROM public.contacts_raw
  WHERE group_contact IS NOT NULL AND trim(group_contact) <> ''
  GROUP BY group_contact
)
UPDATE public.contacts_raw c
SET most_recent_group_contact = a.max_date
FROM agg a
WHERE c.group_contact = a.group_contact
  AND (c.most_recent_group_contact IS DISTINCT FROM a.max_date);

-- 4) Performance index for group_contact lookups
CREATE INDEX IF NOT EXISTS idx_contacts_raw_group_contact
ON public.contacts_raw(group_contact)
WHERE group_contact IS NOT NULL;