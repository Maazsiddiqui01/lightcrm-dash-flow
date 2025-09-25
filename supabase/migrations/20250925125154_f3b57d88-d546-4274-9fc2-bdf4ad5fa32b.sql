-- 1) Focus meta (sector + leads/assistant + description)
CREATE OR REPLACE FUNCTION public.get_focus_meta(focus_areas text[])
RETURNS TABLE(
  focus_area text,
  sector_id text,
  description text,
  lead1_name text,
  lead1_email text,
  lead2_name text,
  lead2_email text,
  assistant_name text,
  assistant_email text
)
LANGUAGE sql STABLE AS $$
  SELECT fa.focus_area,
         lfa.sector_id,
         fad."Description" as description,
         dir.lead1_name, 
         dir.lead1_email,
         dir.lead2_name, 
         dir.lead2_email,
         dir.assistant_name, 
         dir.assistant_email
  FROM unnest(focus_areas) fa(focus_area)
  LEFT JOIN public.lookup_focus_areas lfa ON lfa.label = fa.focus_area
  LEFT JOIN public.focus_area_description fad ON fad."LG Focus Area" = fa.focus_area
  LEFT JOIN public.lg_focus_area_directory dir ON dir.focus_area = fa.focus_area
$$;

-- 2) Opportunities for a contact (sort by EBITDA desc; blanks last)
CREATE OR REPLACE FUNCTION public.get_opps_for_contact(full_name text, limit_n int DEFAULT 3)
RETURNS TABLE(deal_name text)
LANGUAGE sql STABLE AS $$
  SELECT o.deal_name
  FROM public.opportunities_raw o
  WHERE o.deal_source_individual_1 = full_name
     OR o.deal_source_individual_2 = full_name
  ORDER BY o.ebitda_in_ms DESC NULLS LAST
  LIMIT limit_n
$$;

-- 3) Enriched bundle for a contact id (everything the UI needs)
CREATE OR REPLACE FUNCTION public.get_contact_enriched(contact_id uuid, opp_limit int DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql STABLE AS $$
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
$$;

-- 4) Email templates table for presets and custom templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_preset boolean NOT NULL DEFAULT false,
  -- case selection knobs used by the router/preview
  gb_present boolean,
  fa_bucket int CHECK (fa_bucket IN (1,2,3)),   -- 1, 2, or 3 (meaning ≥3)
  has_opps boolean,
  delta_type text CHECK (delta_type IN ('Email','Meeting')),
  subject_mode text DEFAULT 'lg_first' CHECK (subject_mode IN ('lg_first','fa_first')),
  max_opps int DEFAULT 3,
  -- HS/LS flags to lock behavior, else null to auto
  hs_present boolean,
  ls_present boolean,
  -- optional freeform instructions and insertion point
  custom_instructions text,
  custom_insertion text DEFAULT 'before_closing' CHECK (custom_insertion IN ('intro','after_bullets','before_closing')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "Templates are readable by everyone" 
ON public.email_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Templates can be inserted by everyone" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Templates can be updated by everyone" 
ON public.email_templates 
FOR UPDATE 
USING (true);

CREATE POLICY "Templates can be deleted by everyone" 
ON public.email_templates 
FOR DELETE 
USING (true);

-- Index for better performance on common queries
CREATE INDEX idx_email_templates_is_preset ON public.email_templates(is_preset);
CREATE INDEX idx_email_templates_created_at ON public.email_templates(created_at DESC);