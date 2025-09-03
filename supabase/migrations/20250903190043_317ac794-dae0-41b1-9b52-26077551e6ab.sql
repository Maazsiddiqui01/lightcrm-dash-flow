-- Create KPI filter values table
CREATE TABLE IF NOT EXISTS public.kpi_filter_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_areas TEXT[] DEFAULT '{}',
  lg_leads TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Populate with sample data from existing tables
INSERT INTO public.kpi_filter_values (focus_areas, lg_leads) 
SELECT 
  ARRAY(
    SELECT DISTINCT unnest(
      ARRAY[
        lg_focus_area_1, lg_focus_area_2, lg_focus_area_3, lg_focus_area_4,
        lg_focus_area_5, lg_focus_area_6, lg_focus_area_7, lg_focus_area_8
      ]
    ) 
    FROM contacts_app 
    WHERE lg_focus_area_1 IS NOT NULL
  ) as focus_areas,
  ARRAY(
    SELECT DISTINCT lg_sector 
    FROM contacts_app 
    WHERE lg_sector IS NOT NULL
  ) as lg_leads
ON CONFLICT DO NOTHING;

-- Create RPC for KPI summary
CREATE OR REPLACE FUNCTION public.kpi_summary(
  p_start DATE,
  p_end DATE,
  p_focus_area TEXT DEFAULT NULL,
  p_lg_lead_name TEXT DEFAULT NULL,
  p_ebitda_min NUMERIC DEFAULT 35,
  p_family_owned_only BOOLEAN DEFAULT true
)
RETURNS TABLE(
  total_contacts BIGINT,
  meetings_count BIGINT,
  notable_opportunities BIGINT
)
LANGUAGE SQL
STABLE
AS $$
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
$$;

-- Create RPC for monthly meetings
CREATE OR REPLACE FUNCTION public.kpi_meetings_monthly(
  p_start DATE,
  p_end DATE,
  p_focus_area TEXT DEFAULT NULL,
  p_lg_lead_name TEXT DEFAULT NULL
)
RETURNS TABLE(
  month TEXT,
  count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    TO_CHAR(DATE_TRUNC('month', i.occurred_at), 'YYYY-MM') as month,
    COUNT(*) as count
  FROM interactions_app i
  WHERE i.occurred_at >= p_start::timestamp
    AND i.occurred_at <= p_end::timestamp + interval '23:59:59'
    AND COALESCE(i.source, '') ILIKE '%meeting%'
  GROUP BY DATE_TRUNC('month', i.occurred_at)
  ORDER BY DATE_TRUNC('month', i.occurred_at);
$$;

-- Create RPC for LG leads hours and opportunities
CREATE OR REPLACE FUNCTION public.kpi_lg_hours_and_opps(
  p_start DATE,
  p_end DATE,
  p_default_meeting_min INTEGER DEFAULT 60
)
RETURNS TABLE(
  lg_lead TEXT,
  avg_hours_per_week NUMERIC,
  opportunities TEXT
)
LANGUAGE SQL
STABLE
AS $$
  WITH lg_stats AS (
    SELECT 
      c.lg_sector,
      COUNT(DISTINCT c.id) as contact_count,
      COALESCE(SUM(c.of_meetings), 0) as total_meetings,
      STRING_AGG(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name) as deal_names
    FROM contacts_app c
    LEFT JOIN opportunities_app o ON o.deal_source_individual_1 = c.full_name 
                                  OR o.deal_source_individual_2 = c.full_name
    WHERE c.lg_sector IS NOT NULL
      AND c.most_recent_contact >= p_start::timestamp
      AND c.most_recent_contact <= p_end::timestamp + interval '23:59:59'
    GROUP BY c.lg_sector
  )
  SELECT 
    lg_sector as lg_lead,
    ROUND(
      (total_meetings * p_default_meeting_min / 60.0) / 
      GREATEST(EXTRACT(EPOCH FROM (p_end::timestamp - p_start::timestamp)) / (7 * 24 * 3600), 1)
    , 2) as avg_hours_per_week,
    COALESCE(deal_names, contact_count::TEXT || ' contacts') as opportunities
  FROM lg_stats
  ORDER BY avg_hours_per_week DESC;
$$;

-- Enable RLS on kpi_filter_values
ALTER TABLE public.kpi_filter_values ENABLE ROW LEVEL SECURITY;

-- Create policy for kpi_filter_values
CREATE POLICY "kpi_filter_values_select_all"
ON public.kpi_filter_values
FOR SELECT
USING (true);