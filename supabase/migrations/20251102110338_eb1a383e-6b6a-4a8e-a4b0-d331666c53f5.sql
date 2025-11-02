-- Fix refresh_missing_contacts to prevent "query returned more than one row" error
CREATE OR REPLACE FUNCTION public.refresh_missing_contacts(p_exclude_domain text DEFAULT 'lindsaygoldbergllc.com'::text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_inserted int := 0;
begin
  -- Find emails from interactions that are not in contacts_raw or dismissed
  -- and insert them as pending candidates
  with interaction_emails as (
    select distinct unnest(emails_arr) as email
    from public.emails_meetings_raw
    where emails_arr is not null
  ),
  filtered as (
    select 
      ie.email,
      split_part(ie.email, '@', 1) as email_name,
      split_part(ie.email, '@', 2) as email_domain
    from interaction_emails ie
    where ie.email is not null
      and ie.email != ''
      and public.is_valid_email(ie.email)
      -- Exclude specified domain
      and (p_exclude_domain is null or split_part(ie.email, '@', 2) != p_exclude_domain)
      -- Not already in contacts_raw
      and not exists (
        select 1 from public.contacts_raw c 
        where lower(c.email_address) = lower(ie.email)
      )
      -- Not already dismissed
      and not exists (
        select 1 from public.contacts_dismissed_emails d
        where lower(d.email) = lower(ie.email)
      )
      -- Not already a candidate
      and not exists (
        select 1 from public.contacts_missing_candidates cmc
        where lower(cmc.email) = lower(ie.email)
      )
  )
  insert into public.contacts_missing_candidates (
    email,
    full_name,
    organization,
    status,
    created_at,
    updated_at
  )
  select 
    f.email,
    f.email_name,
    f.email_domain,
    'pending'::text,
    now(),
    now()
  from filtered f;

  -- Get the count of inserted rows
  get diagnostics v_inserted = row_count;
  
  return v_inserted;
end;
$function$;