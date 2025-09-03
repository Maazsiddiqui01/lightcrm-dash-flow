-- Fix database security issues

-- 1. First, remove all overly permissive RLS policies
DROP POLICY IF EXISTS "contacts_read_all" ON public.contacts_raw;
DROP POLICY IF EXISTS "contacts_write" ON public.contacts_raw;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts_raw;

DROP POLICY IF EXISTS "interactions_read_all" ON public.emails_meetings_raw;
DROP POLICY IF EXISTS "inter_write" ON public.emails_meetings_raw;
DROP POLICY IF EXISTS "inter_update" ON public.emails_meetings_raw;

DROP POLICY IF EXISTS "opps_read_all" ON public.opportunities_raw;
DROP POLICY IF EXISTS "opps_write" ON public.opportunities_raw;
DROP POLICY IF EXISTS "opps_update" ON public.opportunities_raw;

-- 2. Enable RLS on unprotected tables
ALTER TABLE public.contacts_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions_app ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- 3. Create proper authenticated-user-only policies
-- For this CRM, we'll allow any authenticated user to access all data
-- (you can make this more restrictive based on your needs)

-- Contacts Raw
CREATE POLICY "authenticated_users_read_contacts" ON public.contacts_raw
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_contacts" ON public.contacts_raw
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_contacts" ON public.contacts_raw
FOR UPDATE USING (auth.role() = 'authenticated');

-- Contacts App
CREATE POLICY "authenticated_users_read_contacts_app" ON public.contacts_app
FOR SELECT USING (auth.role() = 'authenticated');

-- Opportunities Raw
CREATE POLICY "authenticated_users_read_opportunities" ON public.opportunities_raw
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_opportunities" ON public.opportunities_raw
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_opportunities" ON public.opportunities_raw
FOR UPDATE USING (auth.role() = 'authenticated');

-- Opportunities App
CREATE POLICY "authenticated_users_read_opportunities_app" ON public.opportunities_app
FOR SELECT USING (auth.role() = 'authenticated');

-- Interactions Raw
CREATE POLICY "authenticated_users_read_interactions" ON public.emails_meetings_raw
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_interactions" ON public.emails_meetings_raw
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_update_interactions" ON public.emails_meetings_raw
FOR UPDATE USING (auth.role() = 'authenticated');

-- Interactions App
CREATE POLICY "authenticated_users_read_interactions_app" ON public.interactions_app
FOR SELECT USING (auth.role() = 'authenticated');

-- N8N Chat Histories
CREATE POLICY "authenticated_users_read_chat" ON public.n8n_chat_histories
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_insert_chat" ON public.n8n_chat_histories
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Fix function search paths for security
CREATE OR REPLACE FUNCTION public.last_interaction_for_email(p_email text)
 RETURNS TABLE(id uuid, occurred_at timestamp with time zone, subject text, source text, from_email text, to_emails text, cc_emails text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  select
    i.id,
    i.occurred_at,
    i.subject,
    i.source,
    i.from_email,
    i.to_emails,
    i.cc_emails
  from interactions_parsed i
  where i.emails_arr @> array[lower(trim(p_email))]
  order by i.occurred_at desc
  limit 1
$function$;

CREATE OR REPLACE FUNCTION public.interactions_for_email_recent(p_email text, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, occurred_at timestamp with time zone, subject text, source text, from_email text, to_emails text, cc_emails text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  select
    i.id,
    i.occurred_at,
    i.subject,
    i.source,
    i.from_email,
    i.to_emails,
    i.cc_emails
  from interactions_parsed i
  where i.emails_arr @> array[lower(trim(p_email))]
  order by i.occurred_at desc
  limit p_limit
$function$;

CREATE OR REPLACE FUNCTION public.interactions_query(p_email text DEFAULT NULL::text, p_channel text DEFAULT NULL::text, p_keyword text DEFAULT NULL::text, p_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, occurred_at timestamp with time zone, source text, subject text, from_email text, to_emails text, cc_emails text, organization text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  with base as (
    select
      i.id, i.occurred_at, i.source, i.subject,
      i.from_email, i.to_emails, i.cc_emails, i.organization
    from interactions_parsed i
    where (p_email is null or i.emails_arr @> array[lower(trim(p_email))])
      and (p_channel is null
           or (p_channel = 'email' and i.source ilike '%email%')
           or (p_channel = 'meeting' and i.source ilike '%meeting%'))
      and (p_start is null or i.occurred_at >= p_start)
      and (p_end   is null or i.occurred_at <  p_end)
      and (p_keyword is null or i.subject ilike '%'||p_keyword||'%')
  )
  select * from base
  order by occurred_at desc
  limit p_limit offset p_offset;
$function$;

CREATE OR REPLACE FUNCTION public.opportunities_query(p_name_contains text DEFAULT NULL::text, p_deal_source_name text DEFAULT NULL::text, p_status_in text[] DEFAULT NULL::text[], p_tier_in text[] DEFAULT NULL::text[], p_sector_in text[] DEFAULT NULL::text[], p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, deal_name text, status text, tier text, sector text, lg_focus_area text, date_of_origination text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
  with base as (
    select
      id, deal_name, status, tier, sector, lg_focus_area,
      date_of_origination,
      deal_source_individual_1, deal_source_individual_2,
      normalize_name(deal_source_individual_1) as n1,
      normalize_name(deal_source_individual_2) as n2
    from opportunities_app
  ),
  params as (
    select normalize_name(p_deal_source_name) as qname,
           regexp_split_to_array(normalize_name(p_deal_source_name), '\s+') as toks
  ),
  filt as (
    select b.*
    from base b
    left join params p on true
    where (p_name_contains   is null or b.deal_name ilike '%'||p_name_contains||'%')
      and (p_deal_source_name is null
           or exists (
                select 1 from (values (b.n1), (b.n2)) as v(n)
                where similarity(v.n, p.qname) >= 0.6
                   or (select coalesce(bool_and(v.n like '%'||tok||'%'), false)
                       from unnest(p.toks) tok where tok <> '')
           ))
      and (p_status_in is null or b.status = any(p_status_in))
      and (p_tier_in   is null or b.tier::text = any(p_tier_in))
      and (p_sector_in is null or b.sector = any(p_sector_in))
  )
  select id, deal_name, status, tier, sector, lg_focus_area, date_of_origination
  from filt
  order by coalesce(date_of_origination, '') desc
  limit p_limit offset p_offset;
$function$;

CREATE OR REPLACE FUNCTION public.opportunities_aggregate(p_group_by text, p_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(bucket text, count bigint)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  if p_group_by = 'status' then
    return query
      select coalesce(status,'') as bucket, count(*)
      from opportunities_app
      where (p_start is null or date_of_origination >= p_start)
        and (p_end   is null or date_of_origination <  p_end)
      group by 1 order by 2 desc;
  elsif p_group_by = 'sector' then
    return query
      select coalesce(sector,'') as bucket, count(*)
      from opportunities_app
      where (p_start is null or date_of_origination >= p_start)
        and (p_end   is null or date_of_origination <  p_end)
      group by 1 order by 2 desc;
  elsif p_group_by = 'tier' then
    return query
      select coalesce(tier::text,'') as bucket, count(*)
      from opportunities_app
      where (p_start is null or date_of_origination >= p_start)
        and (p_end   is null or date_of_origination <  p_end)
      group by 1 order by 2 desc;
  else
    return;
  end if;
end;
$function$;