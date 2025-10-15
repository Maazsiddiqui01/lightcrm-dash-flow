-- ============================================
-- FIX 1: Auto-calculate lg_team on opportunities_raw
-- ============================================

-- Create trigger function to auto-calculate lg_team when lead fields change
CREATE OR REPLACE FUNCTION public.trg_update_opportunity_lg_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  leads text[];
  lg_team_value text;
BEGIN
  -- Collect non-null, non-empty lead values
  leads := ARRAY[]::text[];
  
  IF NEW.investment_professional_point_person_1 IS NOT NULL 
     AND trim(NEW.investment_professional_point_person_1) != '' THEN
    leads := leads || trim(NEW.investment_professional_point_person_1);
  END IF;
  
  IF NEW.investment_professional_point_person_2 IS NOT NULL 
     AND trim(NEW.investment_professional_point_person_2) != '' THEN
    leads := leads || trim(NEW.investment_professional_point_person_2);
  END IF;
  
  IF NEW.investment_professional_point_person_3 IS NOT NULL 
     AND trim(NEW.investment_professional_point_person_3) != '' THEN
    leads := leads || trim(NEW.investment_professional_point_person_3);
  END IF;
  
  IF NEW.investment_professional_point_person_4 IS NOT NULL 
     AND trim(NEW.investment_professional_point_person_4) != '' THEN
    leads := leads || trim(NEW.investment_professional_point_person_4);
  END IF;
  
  -- Join with comma-space separator
  lg_team_value := array_to_string(leads, ', ');
  
  -- Update lg_team field
  NEW.lg_team := NULLIF(lg_team_value, '');
  
  RETURN NEW;
END;
$$;

-- Create trigger on opportunities_raw
DROP TRIGGER IF EXISTS trg_opportunities_update_lg_team ON public.opportunities_raw;
CREATE TRIGGER trg_opportunities_update_lg_team
  BEFORE INSERT OR UPDATE OF 
    investment_professional_point_person_1,
    investment_professional_point_person_2,
    investment_professional_point_person_3,
    investment_professional_point_person_4
  ON public.opportunities_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_opportunity_lg_team();

-- ============================================
-- FIX 2: Backfill existing lg_team values
-- ============================================

-- Update all existing records to calculate lg_team
UPDATE public.opportunities_raw
SET lg_team = (
  SELECT string_agg(lead_name, ', ')
  FROM (
    SELECT unnest(ARRAY[
      NULLIF(trim(investment_professional_point_person_1), ''),
      NULLIF(trim(investment_professional_point_person_2), ''),
      NULLIF(trim(investment_professional_point_person_3), ''),
      NULLIF(trim(investment_professional_point_person_4), '')
    ]) AS lead_name
  ) AS leads
  WHERE lead_name IS NOT NULL
)
WHERE lg_team IS DISTINCT FROM (
  SELECT string_agg(lead_name, ', ')
  FROM (
    SELECT unnest(ARRAY[
      NULLIF(trim(investment_professional_point_person_1), ''),
      NULLIF(trim(investment_professional_point_person_2), ''),
      NULLIF(trim(investment_professional_point_person_3), ''),
      NULLIF(trim(investment_professional_point_person_4), '')
    ]) AS lead_name
  ) AS leads
  WHERE lead_name IS NOT NULL
);

-- ============================================
-- FIX 3: Create full-text search indexes
-- ============================================

-- Create GIN index for full-text search on key text fields
CREATE INDEX IF NOT EXISTS idx_opportunities_fts_deal_name 
  ON public.opportunities_raw USING gin(to_tsvector('english', coalesce(deal_name, '')));

CREATE INDEX IF NOT EXISTS idx_opportunities_fts_summary 
  ON public.opportunities_raw USING gin(to_tsvector('english', coalesce(summary_of_opportunity, '')));

CREATE INDEX IF NOT EXISTS idx_opportunities_fts_notes 
  ON public.opportunities_raw USING gin(to_tsvector('english', coalesce(most_recent_notes, '')));

CREATE INDEX IF NOT EXISTS idx_opportunities_fts_next_steps 
  ON public.opportunities_raw USING gin(to_tsvector('english', coalesce(next_steps, '')));

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_opportunities_tier_status_sector 
  ON public.opportunities_raw (tier, status, sector) 
  WHERE tier IS NOT NULL AND status IS NOT NULL;

-- Index for EBITDA range queries
CREATE INDEX IF NOT EXISTS idx_opportunities_ebitda 
  ON public.opportunities_raw (ebitda_in_ms) 
  WHERE ebitda_in_ms IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_opportunities_date_origination 
  ON public.opportunities_raw (date_of_origination) 
  WHERE date_of_origination IS NOT NULL;

COMMENT ON TRIGGER trg_opportunities_update_lg_team ON public.opportunities_raw IS 
  'Auto-calculates lg_team from investment professional point person fields';
COMMENT ON FUNCTION public.trg_update_opportunity_lg_team() IS 
  'Trigger function to auto-calculate lg_team by concatenating non-empty lead names';