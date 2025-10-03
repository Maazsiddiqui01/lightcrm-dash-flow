-- Phase 4: Remove Unnecessary SECURITY DEFINER from Data Query Functions
-- This migration removes SECURITY DEFINER from functions that are just data wrappers
-- and don't require elevated privileges

-- ============================================================================
-- KPI QUERY FUNCTIONS - Remove SECURITY DEFINER
-- These functions just query data and should respect caller's RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.kpi_header(
  p_start date, 
  p_end date, 
  p_focus_areas text[] DEFAULT NULL::text[], 
  p_leads text[] DEFAULT NULL::text[], 
  p_sector text[] DEFAULT NULL::text[], 
  p_ownership text[] DEFAULT NULL::text[]
)
RETURNS TABLE(total_contacts integer, total_meetings integer, notable_opportunities integer)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
declare
  v_default_min int := public.kpi_default_meeting_min();
begin
  return query
  with c as (
    select *
    from public.contacts_norm
    where (p_sector is null or lg_sector = any(p_sector))
      and (
        p_focus_areas is null OR
        exists (
          select 1
          from regexp_split_to_table(coalesce(lg_focus_areas_comprehensive_list,''), '\s*,\s*') fa
          where fa <> '' and fa = any(p_focus_areas)
        )
      )
  ),
  i_meet as (
    select count(*)::int as cnt
    from public.interactions_norm i
    join c on c.email_lc = i.email_lc
    where i.source = 'Meeting'
      and i.occurred_at::date between p_start and p_end
  ),
  o_notable as (
    select count(distinct o.id)::int as cnt
    from public.opportunities_norm o
    left join c on c.norm_full_name in (o.norm_src_1, o.norm_src_2)
    where (p_ownership is null or coalesce(o.ownership_type,'') = any(p_ownership))
  )
  select
    (select count(*) from c) as total_contacts,
    (select coalesce(cnt,0) from i_meet) as total_meetings,
    (select coalesce(cnt,0) from o_notable) as notable_opportunities;
end $function$;

CREATE OR REPLACE FUNCTION public.kpi_meetings_per_month(
  p_start date, 
  p_end date, 
  p_focus_areas text[] DEFAULT NULL::text[], 
  p_sector text[] DEFAULT NULL::text[]
)
RETURNS TABLE(month_label text, meetings integer)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
with c as (
  select *
  from public.contacts_norm
  where (p_sector is null or lg_sector = any(p_sector))
    and (
      p_focus_areas is null OR
      exists (
        select 1
        from regexp_split_to_table(coalesce(lg_focus_areas_comprehensive_list,''), '\s*,\s*') fa
        where fa <> '' and fa = any(p_focus_areas)
      )
    )
),
m as (
  select date_trunc('month', i.occurred_at)::date as mth, count(*)::int as cnt
  from public.interactions_norm i
  join c on c.email_lc = i.email_lc
  where i.source = 'Meeting'
    and i.occurred_at::date between p_start and p_end
  group by 1
)
select to_char(mth, 'Mon YYYY') as month_label, cnt as meetings
from m
order by mth;
$function$;

CREATE OR REPLACE FUNCTION public.kpi_leads_performance(
  p_start date, 
  p_end date, 
  p_focus_areas text[] DEFAULT NULL::text[], 
  p_sector text[] DEFAULT NULL::text[]
)
RETURNS TABLE(lg_lead text, avg_hours_per_week numeric, opportunities integer, top_opportunities text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
declare
  v_weeks numeric := greatest(extract(epoch from (p_end + 1 - p_start)) / 604800.0, 0.01);
  v_default_min int := public.kpi_default_meeting_min();
begin
  return query
  with leads as (
    select lead_name, email, last_name from public.lg_leads_directory
  ),
  c as (
    select *
    from public.contacts_norm
    where (p_sector is null or lg_sector = any(p_sector))
      and (
        p_focus_areas is null OR
        exists (
          select 1
          from regexp_split_to_table(coalesce(lg_focus_areas_comprehensive_list,''), '\s*,\s*') fa
          where fa <> '' and fa = any(p_focus_areas)
        )
      )
  ),
  mtg as (
    select l.lead_name,
           count(*)::int as mtg_count,
           sum(v_default_min)::int as minutes_total
    from public.interactions_norm i
    join leads l on i.email_lc ilike ('%' || lower(l.email) || '%')
    where i.source = 'Meeting'
      and i.occurred_at::date between p_start and p_end
    group by l.lead_name
  ),
  opp as (
    select l.lead_name,
           count(distinct o.id)::int as opp_count,
           string_agg(distinct o.deal_name, ', ' order by o.deal_name) filter (where o.deal_name is not null) as opp_list
    from leads l
    join public.opportunities_norm o
      on normalize_name(l.lead_name) = any(array[o.norm_src_1, o.norm_src_2])
    group by l.lead_name
  )
  select
    l.lead_name as lg_lead,
    round(((coalesce(m.minutes_total,0) / 60.0) / v_weeks) * 4) / 4.0 as avg_hours_per_week,
    coalesce(o.opp_count, 0) as opportunities,
    coalesce(o.opp_list, '—') as top_opportunities
  from (select lead_name from leads) l
  left join mtg m on m.lead_name = l.lead_name
  left join opp o on o.lead_name = l.lead_name
  order by l.lead_name;
end $function$;

-- ============================================================================
-- DATA QUERY FUNCTIONS - Remove SECURITY DEFINER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_contact_enriched(
  contact_id uuid, 
  opp_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  fa text[];
  meta jsonb;
  opps jsonb;
BEGIN
  SELECT *,
         string_to_array(coalesce(lg_focus_areas_comprehensive_list, ''), ',')::text[] as fa_array
  INTO c
  FROM public.contacts_raw
  WHERE id = contact_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  fa := (SELECT array_remove(array_agg(trim(v)), '') FROM unnest(c.fa_array) v);
  
  SELECT jsonb_agg(to_jsonb(m)) INTO meta 
  FROM public.get_focus_meta(fa) m;
  
  SELECT jsonb_agg(to_jsonb(x)) INTO opps 
  FROM (SELECT deal_name FROM public.get_opps_for_contact(c.full_name, opp_limit)) x;

  RETURN jsonb_build_object(
    'contact', jsonb_build_object(
      'firstName', c.first_name,
      'email', c.email_address,
      'organization', c.organization,
      'lgEmailsCc', coalesce(c.email_cc,''),
      'fullName', c.full_name
    ),
    'focusAreas', fa,
    'delta_type', c.delta_type,
    'mostRecentContact', coalesce(c.most_recent_contact::text,'0'),
    'OutreachDate', coalesce(c.outreach_date, current_date),
    'has_opps', coalesce(c.all_opps,0) > 0,
    'opps', coalesce(opps, '[]'::jsonb),
    'focusMeta', coalesce(meta, '[]'::jsonb)
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.interactions_query(
  p_email text DEFAULT NULL::text, 
  p_channel text DEFAULT NULL::text, 
  p_keyword text DEFAULT NULL::text, 
  p_start timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, 
  occurred_at timestamp with time zone, 
  source text, 
  subject text, 
  from_email text, 
  to_emails text, 
  cc_emails text, 
  organization text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
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
      and (p_end is null or i.occurred_at < p_end)
      and (p_keyword is null or i.subject ilike '%'||p_keyword||'%')
  )
  select * from base
  order by occurred_at desc
  limit p_limit offset p_offset;
$function$;

CREATE OR REPLACE FUNCTION public.opportunities_query(
  p_name_contains text DEFAULT NULL::text, 
  p_deal_source_name text DEFAULT NULL::text, 
  p_status_in text[] DEFAULT NULL::text[], 
  p_tier_in text[] DEFAULT NULL::text[], 
  p_sector_in text[] DEFAULT NULL::text[], 
  p_limit integer DEFAULT 50, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, 
  deal_name text, 
  status text, 
  tier text, 
  sector text, 
  lg_focus_area text, 
  date_of_origination text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
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
    where (p_name_contains is null or b.deal_name ilike '%'||p_name_contains||'%')
      and (p_deal_source_name is null
           or exists (
                select 1 from (values (b.n1), (b.n2)) as v(n)
                where similarity(v.n, p.qname) >= 0.6
                   or (select coalesce(bool_and(v.n like '%'||tok||'%'), false)
                       from unnest(p.toks) tok where tok <> '')
           ))
      and (p_status_in is null or b.status = any(p_status_in))
      and (p_tier_in is null or b.tier::text = any(p_tier_in))
      and (p_sector_in is null or b.sector = any(p_sector_in))
  )
  select id, deal_name, status, tier, sector, lg_focus_area, date_of_origination
  from filt
  order by coalesce(date_of_origination, '') desc
  limit p_limit offset p_offset;
$function$;

CREATE OR REPLACE FUNCTION public.kpi_summary(
  p_start date, 
  p_end date, 
  p_focus_area text DEFAULT NULL::text, 
  p_lg_lead_name text DEFAULT NULL::text, 
  p_ebitda_min numeric DEFAULT 35, 
  p_family_owned_only boolean DEFAULT true
)
RETURNS TABLE(total_contacts bigint, meetings_count bigint, notable_opportunities bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH filtered_contacts AS (
    SELECT c.*
    FROM contacts_app c
    WHERE (p_focus_area IS NULL OR 
           p_focus_area IN (lg_focus_area_1, lg_focus_area_2, lg_focus_area_3, lg_focus_area_4,
                           lg_focus_area_5, lg_focus_area_6, lg_focus_area_7, lg_focus_area_8))
      AND (p_lg_lead_name IS NULL OR lg_sector = p_lg_lead_name)
  ),
  meeting_counts AS (
    SELECT COUNT(*) as count
    FROM interactions_app i
    WHERE i.occurred_at >= p_start::timestamp
      AND i.occurred_at <= p_end::timestamp + interval '23:59:59'
      AND COALESCE(i.source, '') ILIKE '%meeting%'
  ),
  opportunity_counts AS (
    SELECT COUNT(*) as count
    FROM opportunities_app o
    WHERE (p_family_owned_only = false OR 
           COALESCE(o.ownership_type, '') ILIKE '%family%' OR 
           COALESCE(o.ownership_type, '') ILIKE '%founder%')
      AND COALESCE(o.ebitda_in_ms, 0) >= p_ebitda_min
  )
  SELECT 
    (SELECT COUNT(*) FROM filtered_contacts)::BIGINT as total_contacts,
    (SELECT count FROM meeting_counts)::BIGINT as meetings_count,
    (SELECT count FROM opportunity_counts)::BIGINT as notable_opportunities;
$function$;

CREATE OR REPLACE FUNCTION public.kpi_meetings_monthly(
  p_start date, 
  p_end date, 
  p_focus_area text DEFAULT NULL::text, 
  p_lg_lead_name text DEFAULT NULL::text
)
RETURNS TABLE(month text, count bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT 
    TO_CHAR(DATE_TRUNC('month', i.occurred_at), 'YYYY-MM') as month,
    COUNT(*) as count
  FROM interactions_app i
  WHERE i.occurred_at >= p_start::timestamp
    AND i.occurred_at <= p_end::timestamp + interval '23:59:59'
    AND COALESCE(i.source, '') ILIKE '%meeting%'
  GROUP BY DATE_TRUNC('month', i.occurred_at)
  ORDER BY DATE_TRUNC('month', i.occurred_at);
$function$;