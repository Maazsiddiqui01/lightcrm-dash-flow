-- Phase 1: Duplicate Detection System
-- Table to track duplicate contacts (same email, different owners)
CREATE TABLE IF NOT EXISTS public.contact_duplicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address text NOT NULL,
  user_count integer NOT NULL,
  user_ids uuid[] NOT NULL,
  contact_ids uuid[] NOT NULL,
  first_detected_at timestamp with time zone NOT NULL DEFAULT now(),
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'accepted')),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  resolution_note text,
  UNIQUE(email_address)
);

ALTER TABLE public.contact_duplicates ENABLE ROW LEVEL SECURITY;

-- RLS: Users see duplicates involving their contacts, admins see all
CREATE POLICY "Users see own duplicate contacts" 
ON public.contact_duplicates 
FOR SELECT 
USING (
  auth.uid() = ANY(user_ids) OR is_admin(auth.uid())
);

CREATE POLICY "Admins manage duplicates" 
ON public.contact_duplicates 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Function to detect and log duplicates
CREATE OR REPLACE FUNCTION public.detect_contact_duplicates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear existing active duplicates
  DELETE FROM public.contact_duplicates WHERE status = 'active';
  
  -- Insert current duplicates
  INSERT INTO public.contact_duplicates (
    email_address, 
    user_count, 
    user_ids, 
    contact_ids,
    status
  )
  SELECT 
    lower(trim(email_address)) as email_address,
    COUNT(DISTINCT COALESCE(assigned_to, created_by))::integer as user_count,
    array_agg(DISTINCT COALESCE(assigned_to, created_by)) as user_ids,
    array_agg(id) as contact_ids,
    'active' as status
  FROM public.contacts_raw
  WHERE email_address IS NOT NULL 
    AND trim(email_address) <> ''
    AND (assigned_to IS NOT NULL OR created_by IS NOT NULL)
  GROUP BY lower(trim(email_address))
  HAVING COUNT(DISTINCT COALESCE(assigned_to, created_by)) > 1
  ON CONFLICT (email_address) 
  DO UPDATE SET
    user_count = EXCLUDED.user_count,
    user_ids = EXCLUDED.user_ids,
    contact_ids = EXCLUDED.contact_ids,
    last_updated_at = now();
END;
$$;

-- Trigger to detect duplicates on contact changes
CREATE OR REPLACE FUNCTION public.log_contact_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_duplicate_count integer;
BEGIN
  -- Get normalized email
  v_email := lower(trim(COALESCE(NEW.email_address, '')));
  
  IF v_email = '' THEN
    RETURN NEW;
  END IF;
  
  -- Check for duplicates
  SELECT COUNT(DISTINCT COALESCE(assigned_to, created_by))
  INTO v_duplicate_count
  FROM public.contacts_raw
  WHERE lower(trim(email_address)) = v_email
    AND (assigned_to IS NOT NULL OR created_by IS NOT NULL);
  
  -- If duplicates exist, refresh the duplicate detection
  IF v_duplicate_count > 1 THEN
    PERFORM public.detect_contact_duplicates();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_duplicate_contacts ON public.contacts_raw;
CREATE TRIGGER trg_detect_duplicate_contacts
AFTER INSERT OR UPDATE OF email_address, assigned_to, created_by
ON public.contacts_raw
FOR EACH ROW
EXECUTE FUNCTION public.log_contact_duplicate();

-- View for detailed duplicate information
CREATE OR REPLACE VIEW public.contact_duplicates_detailed AS
SELECT 
  cd.id,
  cd.email_address,
  cd.user_count,
  cd.status,
  cd.first_detected_at,
  cd.last_updated_at,
  cd.resolved_at,
  cd.resolution_note,
  jsonb_agg(
    jsonb_build_object(
      'contact_id', c.id,
      'full_name', c.full_name,
      'organization', c.organization,
      'user_id', COALESCE(c.assigned_to, c.created_by),
      'user_email', p.email,
      'user_name', p.full_name,
      'created_at', c.created_at
    ) ORDER BY c.created_at
  ) as contacts
FROM public.contact_duplicates cd
CROSS JOIN LATERAL unnest(cd.contact_ids) WITH ORDINALITY AS contact_id
JOIN public.contacts_raw c ON c.id = contact_id
LEFT JOIN public.profiles p ON p.id = COALESCE(c.assigned_to, c.created_by)
WHERE cd.status = 'active'
GROUP BY cd.id, cd.email_address, cd.user_count, cd.status, 
         cd.first_detected_at, cd.last_updated_at, cd.resolved_at, cd.resolution_note;

-- Phase 2: Contact Locking System
-- Add locking columns to contacts_raw
ALTER TABLE public.contacts_raw 
ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS lock_reason text;

-- Function to lock a contact
CREATE OR REPLACE FUNCTION public.lock_contact(
  p_contact_id uuid,
  p_duration_minutes integer DEFAULT 30,
  p_reason text DEFAULT 'Composing email'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_lock record;
  v_result jsonb;
BEGIN
  -- Check if already locked
  SELECT locked_by, locked_until, lock_reason
  INTO v_current_lock
  FROM public.contacts_raw
  WHERE id = p_contact_id;
  
  -- If locked and not expired
  IF v_current_lock.locked_by IS NOT NULL 
     AND v_current_lock.locked_until > now() 
     AND v_current_lock.locked_by <> auth.uid() THEN
    
    RETURN jsonb_build_object(
      'success', false,
      'locked', true,
      'locked_by', v_current_lock.locked_by,
      'locked_until', v_current_lock.locked_until,
      'lock_reason', v_current_lock.lock_reason
    );
  END IF;
  
  -- Lock the contact
  UPDATE public.contacts_raw
  SET 
    locked_by = auth.uid(),
    locked_until = now() + (p_duration_minutes || ' minutes')::interval,
    lock_reason = p_reason,
    updated_at = now()
  WHERE id = p_contact_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'locked', true,
    'locked_by', auth.uid(),
    'locked_until', now() + (p_duration_minutes || ' minutes')::interval,
    'lock_reason', p_reason
  );
END;
$$;

-- Function to unlock a contact
CREATE OR REPLACE FUNCTION public.unlock_contact(p_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_lock record;
BEGIN
  SELECT locked_by INTO v_current_lock
  FROM public.contacts_raw
  WHERE id = p_contact_id;
  
  -- Only owner or admin can unlock
  IF v_current_lock.locked_by = auth.uid() OR is_admin(auth.uid()) THEN
    UPDATE public.contacts_raw
    SET 
      locked_by = NULL,
      locked_until = NULL,
      lock_reason = NULL,
      updated_at = now()
    WHERE id = p_contact_id;
    
    RETURN jsonb_build_object('success', true, 'locked', false);
  END IF;
  
  RETURN jsonb_build_object('success', false, 'error', 'Not authorized to unlock');
END;
$$;

-- Trigger to auto-release expired locks
CREATE OR REPLACE FUNCTION public.release_expired_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contacts_raw
  SET 
    locked_by = NULL,
    locked_until = NULL,
    lock_reason = NULL
  WHERE locked_until < now();
END;
$$;

-- Phase 3: Notification System
CREATE TABLE IF NOT EXISTS public.contact_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts_raw(id) ON DELETE CASCADE,
  duplicate_id uuid REFERENCES public.contact_duplicates(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('duplicate_detected', 'duplicate_resolved', 'contact_requested')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

ALTER TABLE public.contact_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users see only their notifications, admins see all
CREATE POLICY "Users see own notifications" 
ON public.contact_notifications 
FOR SELECT 
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users update own notifications" 
ON public.contact_notifications 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System creates notifications" 
ON public.contact_notifications 
FOR INSERT 
WITH CHECK (true);

-- Function to notify users about duplicates
CREATE OR REPLACE FUNCTION public.notify_duplicate_detected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_other_users text;
BEGIN
  -- Notify each user who owns a duplicate contact
  FOREACH v_user_id IN ARRAY NEW.user_ids LOOP
    -- Get names of other users
    SELECT string_agg(p.full_name, ', ')
    INTO v_other_users
    FROM unnest(NEW.user_ids) uid
    JOIN public.profiles p ON p.id = uid
    WHERE uid <> v_user_id;
    
    INSERT INTO public.contact_notifications (
      user_id,
      duplicate_id,
      notification_type,
      title,
      message
    ) VALUES (
      v_user_id,
      NEW.id,
      'duplicate_detected',
      'Duplicate Contact Detected',
      'Contact with email ' || NEW.email_address || ' is also owned by: ' || COALESCE(v_other_users, 'other users')
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_duplicate ON public.contact_duplicates;
CREATE TRIGGER trg_notify_duplicate
AFTER INSERT OR UPDATE
ON public.contact_duplicates
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION public.notify_duplicate_detected();

-- Run initial duplicate detection
SELECT public.detect_contact_duplicates();