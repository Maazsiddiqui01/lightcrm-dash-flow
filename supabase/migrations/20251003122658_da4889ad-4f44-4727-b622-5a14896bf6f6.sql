
-- Fix: Infinite recursion in user_roles and unnecessary SECURITY DEFINER

-- 1. Fix the infinite recursion in user_roles policies
-- The policy was querying user_roles itself, causing infinite recursion
-- Use the is_admin() function instead which has SECURITY DEFINER to break the cycle

DROP POLICY IF EXISTS "user_roles_modify_admin" ON public.user_roles;

CREATE POLICY "user_roles_modify_admin"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 2. Remove SECURITY DEFINER from functions that don't need elevated privileges
-- api_tom_new_view is just a view wrapper that should respect caller's RLS

CREATE OR REPLACE FUNCTION public.api_tom_new_view()
RETURNS TABLE(
  deal_source_company text, 
  deal_source_individual text, 
  lg_sector text, 
  lg_focus_area text, 
  areas_of_specialization text, 
  lg_lead text, 
  most_recent_contact date, 
  delta integer, 
  delta_type text, 
  no_of_emails integer, 
  no_of_meetings integer, 
  next_scheduled_outreach_date date, 
  deal_name text, 
  has_opps text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    deal_source_company,
    deal_source_individual,
    lg_sector,
    lg_focus_area,
    areas_of_specialization,
    lg_lead,
    most_recent_contact,
    delta,
    delta_type,
    no_of_emails,
    no_of_meetings,
    next_scheduled_outreach_date,
    deal_name,
    has_opps
  FROM tom_new_view
  ORDER BY most_recent_contact DESC NULLS LAST;
$function$;

-- avg_minutes_per_week_by_lead doesn't need SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.avg_minutes_per_week_by_lead(
  start_date date DEFAULT NULL::date, 
  end_date date DEFAULT NULL::date
)
RETURNS TABLE(lead_name text, avg_minutes_per_week integer)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH bounds AS (
    SELECT
      COALESCE(start_date, (SELECT MIN(occurred_at) FROM one_on_one_meetings)) AS s,
      COALESCE(end_date, (SELECT MAX(occurred_at) FROM one_on_one_meetings)) AS e
  ),
  weeks AS (
    SELECT GREATEST(1.0, ((b.e - b.s) + 1) / 7.0) AS n_weeks
    FROM bounds b
  )
  SELECT
    o.lead_name,
    ROUND((COUNT(*) * 30) / w.n_weeks, 0)::INT AS avg_minutes_per_week
  FROM one_on_one_meetings o
  CROSS JOIN bounds b
  CROSS JOIN weeks w
  WHERE o.occurred_at BETWEEN b.s AND b.e
  GROUP BY o.lead_name, w.n_weeks
  ORDER BY o.lead_name;
$function$;
