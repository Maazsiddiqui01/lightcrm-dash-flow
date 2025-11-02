-- Fix NULL email contacts first
UPDATE contacts_raw 
SET email_address = lower(regexp_replace(full_name, '[^a-z0-9]', '.', 'gi')) || '@unknown.com',
    notes = COALESCE(notes || E'\n\n', '') || '[System Note] Email was NULL and has been assigned a placeholder. Original contact had no email address.'
WHERE email_address IS NULL;

-- Add NOT NULL constraint to prevent future NULL emails
ALTER TABLE contacts_raw ALTER COLUMN email_address SET NOT NULL;

-- Drop and recreate dismiss_missing_contact (signature changed)
DROP FUNCTION IF EXISTS public.dismiss_missing_contact(text);

CREATE FUNCTION public.dismiss_missing_contact(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_email text := lower(trim(p_email));
begin
  -- Validate email
  if v_email is null or v_email = '' then
    raise exception 'Email required';
  end if;

  -- Update the candidate status to dismissed
  update public.contacts_missing_candidates
  set status = 'dismissed', updated_at = now()
  where lower(email) = v_email;

  if not found then
    raise exception 'No candidate found for email: %', v_email;
  end if;
end;
$function$;

-- Fix approve_missing_contact to handle edge cases
CREATE OR REPLACE FUNCTION public.approve_missing_contact(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_email text := lower(trim(p_email));
  v_candidate_record record;
  v_contact_id uuid;
begin
  -- Strict email validation
  if v_email is null or v_email = '' then
    raise exception 'Email required';
  end if;

  -- Get the candidate record
  select * into v_candidate_record
  from public.contacts_missing_candidates
  where lower(email) = v_email and status = 'pending';

  if not found then
    raise exception 'No pending candidate found for email: %', v_email;
  end if;

  -- Check if contact already exists (with LIMIT 1 to prevent multiple row error)
  select id into v_contact_id
  from public.contacts_raw
  where email_address IS NOT NULL 
    and lower(email_address) = v_email
  LIMIT 1;

  if v_contact_id is not null then
    -- Contact already exists, just update the candidate status
    update public.contacts_missing_candidates
    set status = 'approved', updated_at = now()
    where lower(email) = v_email;
    
    return v_contact_id;
  end if;

  -- Create the contact in contacts_raw
  insert into public.contacts_raw (
    email_address, 
    full_name, 
    organization,
    created_by,
    assigned_to,
    created_at, 
    updated_at
  )
  values (
    v_email,
    coalesce(nullif(trim(v_candidate_record.full_name), ''), v_email),
    coalesce(nullif(trim(v_candidate_record.organization), ''), split_part(v_email, '@', 2)),
    auth.uid(),
    auth.uid(),
    now(), 
    now()
  )
  returning id into v_contact_id;

  -- Update the candidate status to approved
  update public.contacts_missing_candidates
  set status = 'approved', updated_at = now()
  where lower(email) = v_email;

  return v_contact_id;
end;
$function$;