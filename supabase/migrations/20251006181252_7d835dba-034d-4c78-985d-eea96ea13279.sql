-- ============================================================================
-- PRIORITY 1 & 2 SECURITY FIXES
-- ============================================================================

-- ============================================================================
-- PRIORITY 1.1: Fix Profiles Table RLS Policy
-- ============================================================================

-- Drop the overly permissive policy that allows any authenticated user to see all profiles
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create a secure policy: users can only see their own profile, admins can see all
CREATE POLICY "Users view own profile or admins view all" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id OR public.is_admin(auth.uid())
);

-- ============================================================================
-- PRIORITY 1.2: Add SET search_path TO 'public' to Security Definer Functions
-- ============================================================================

-- Fix add_opportunity_note (first overload - 3 params)
CREATE OR REPLACE FUNCTION public.add_opportunity_note(p_opportunity_id uuid, p_field text, p_content text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_field = 'next_steps' THEN
    UPDATE opportunities_raw
    SET next_steps = p_content, updated_at = now()
    WHERE id = p_opportunity_id;
  ELSIF p_field = 'most_recent_notes' THEN
    UPDATE opportunities_raw
    SET most_recent_notes = p_content, updated_at = now()
    WHERE id = p_opportunity_id;
  END IF;
END
$function$;

-- Fix add_opportunity_note (second overload - 4 params with due_date)
CREATE OR REPLACE FUNCTION public.add_opportunity_note(p_opportunity_id uuid, p_field text, p_content text, p_due_date date DEFAULT NULL::date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_field = 'next_steps' THEN
    UPDATE opportunities_raw
    SET next_steps = p_content, 
        next_steps_due_date = p_due_date,
        updated_at = now()
    WHERE id = p_opportunity_id;
  ELSIF p_field = 'most_recent_notes' THEN
    UPDATE opportunities_raw
    SET most_recent_notes = p_content, 
        updated_at = now()
    WHERE id = p_opportunity_id;
  END IF;
END
$function$;

-- Fix approve_contact_candidate
CREATE OR REPLACE FUNCTION public.approve_contact_candidate(p_email text, p_full_name text DEFAULT NULL::text, p_organization text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  if v_email is null or v_email = '' then
    raise exception 'Email required';
  end if;

  -- if already exists, return its id
  select id into v_id
  from public.contacts_raw
  where lower(email_address) = v_email;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.contacts_raw (
    email_address, full_name, organization, created_at, updated_at
  )
  values (
    v_email,
    coalesce(nullif(trim(p_full_name), ''), public.guess_name_from_email(v_email)),
    nullif(trim(p_organization), ''),
    now(), now()
  )
  returning id into v_id;

  -- Optional: if it was previously dismissed, clear it so it could reappear later if removed
  delete from public.contacts_dismissed_emails where lower(email) = v_email;

  return v_id;
end;
$function$;

-- Fix dismiss_contact_candidate
CREATE OR REPLACE FUNCTION public.dismiss_contact_candidate(p_email text, p_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.contacts_dismissed_emails(email, note)
  values (lower(trim(p_email)), nullif(trim(p_note), ''))
  on conflict (email) do update
  set dismissed_at = now(), note = excluded.note;
end;
$function$;

-- Fix set_intentional_no_outreach
CREATE OR REPLACE FUNCTION public.set_intentional_no_outreach(p_contact_id uuid, p_note text DEFAULT NULL::text, p_action_type text DEFAULT 'skip'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_action_type = 'skip' THEN
    UPDATE public.contacts_raw
    SET 
      intentional_no_outreach = TRUE,
      intentional_no_outreach_date = now(),
      intentional_no_outreach_note = p_note,
      most_recent_contact = now()::date
    WHERE id = p_contact_id;
  ELSIF p_action_type = 'undo' THEN
    UPDATE public.contacts_raw
    SET 
      intentional_no_outreach = FALSE,
      intentional_no_outreach_date = NULL,
      intentional_no_outreach_note = NULL
    WHERE id = p_contact_id;
  END IF;

  INSERT INTO public.contact_intentional_no_outreach_events (
    contact_id, 
    performed_by, 
    note, 
    action_type
  )
  VALUES (
    p_contact_id, 
    auth.uid(), 
    p_note, 
    p_action_type
  );
END;
$function$;

-- ============================================================================
-- PRIORITY 2: Auth Configuration Updates
-- ============================================================================

-- Note: These settings may need to be configured via Supabase Dashboard
-- as direct auth.config table modifications might be overridden

-- Reduce OTP expiry from 7200 seconds (2 hours) to 600 seconds (10 minutes)
-- Enable leaked password protection
-- These are recommendations for manual configuration in Supabase Dashboard:
-- 1. Go to Authentication → Settings
-- 2. Set "OTP Expiry" to 600 seconds
-- 3. Enable "Leaked Password Protection"

-- Add comment for tracking
COMMENT ON TABLE public.profiles IS 'Security hardened: RLS restricts to own profile + admin access only';
COMMENT ON FUNCTION public.add_opportunity_note(uuid, text, text) IS 'Security hardened: search_path set to public';
COMMENT ON FUNCTION public.add_opportunity_note(uuid, text, text, date) IS 'Security hardened: search_path set to public';
COMMENT ON FUNCTION public.approve_contact_candidate(text, text, text) IS 'Security hardened: search_path set to public';
COMMENT ON FUNCTION public.dismiss_contact_candidate(text, text) IS 'Security hardened: search_path set to public';
COMMENT ON FUNCTION public.set_intentional_no_outreach(uuid, text, text) IS 'Security hardened: search_path set to public';