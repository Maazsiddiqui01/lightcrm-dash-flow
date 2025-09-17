-- Drop existing functions so we can recreate them with proper return types
DROP FUNCTION IF EXISTS public.approve_missing_contact(text);
DROP FUNCTION IF EXISTS public.dismiss_missing_contact(text);

-- Recreate approve_missing_contact to actually create a contact in contacts_raw
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

  -- Check if contact already exists in contacts_raw
  select id into v_contact_id
  from public.contacts_raw
  where lower(email_address) = v_email;

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
    created_at, 
    updated_at
  )
  values (
    v_email,
    coalesce(nullif(trim(v_candidate_record.full_name), ''), public.guess_name_from_email(v_email)),
    coalesce(nullif(trim(v_candidate_record.organization), ''), public.guess_org_from_email(v_email)),
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

-- Recreate dismiss_missing_contact to delete the candidate record
CREATE OR REPLACE FUNCTION public.dismiss_missing_contact(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' then
    raise exception 'Email required';
  end if;

  -- Delete the candidate record entirely
  delete from public.contacts_missing_candidates
  where lower(email) = v_email;

  -- Also add to dismissed emails table to prevent re-discovery
  insert into public.contacts_dismissed_emails(email, dismissed_at)
  values (v_email, now())
  on conflict (email) do update
  set dismissed_at = now();

  return true;
end;
$function$;