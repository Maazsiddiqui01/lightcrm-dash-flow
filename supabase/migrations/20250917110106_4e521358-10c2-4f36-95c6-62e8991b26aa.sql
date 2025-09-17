-- Create canonical lookup tables for sectors and focus areas

-- 4 fixed sectors
CREATE TABLE IF NOT EXISTS public.lookup_sectors (
  id text PRIMARY KEY,
  label text NOT NULL UNIQUE
);

INSERT INTO public.lookup_sectors (id, label)
VALUES
  ('general','General'),
  ('healthcare','Healthcare'),
  ('industrials','Industrials'),
  ('services','Services')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- Focus areas catalog with sector mapping
CREATE TABLE IF NOT EXISTS public.lookup_focus_areas (
  id text PRIMARY KEY,
  label text NOT NULL UNIQUE,
  sector_id text NOT NULL REFERENCES public.lookup_sectors(id)
);

-- Populate focus areas with comprehensive list
INSERT INTO public.lookup_focus_areas (id, label, sector_id) VALUES
  -- Healthcare
  ('hc-payor-employer', 'HC: Payor & Employer Services', 'healthcare'),
  ('hc-rcm', 'HC: Revenue Cycle Management', 'healthcare'),
  ('hc-nonclinical', 'HC: Non-Clinical Services', 'healthcare'),
  ('hc-clinical', 'HC: Clinical Services', 'healthcare'),
  ('hc-tech-enablement', 'HC: Tech Enablement', 'healthcare'),
  ('hc-pharma-biotech', 'HC: Pharma & Biotech Services', 'healthcare'),
  
  -- Industrials  
  ('capital-goods-equipment', 'Capital Goods / Equipment', 'industrials'),
  ('aerospace-defense', 'Aerospace & Defense', 'industrials'),
  ('automotive-transport', 'Automotive & Transportation', 'industrials'),
  ('chemicals-materials', 'Chemicals & Materials', 'industrials'),
  ('energy-utilities', 'Energy & Utilities', 'industrials'),
  ('construction-infrastructure', 'Construction & Infrastructure', 'industrials'),
  
  -- Services
  ('waste-environmental', 'Waste & Environmental Services', 'services'),
  ('business-services', 'Business Services', 'services'),
  ('financial-services', 'Financial Services', 'services'),
  ('technology-services', 'Technology Services', 'services'),
  ('education-training', 'Education & Training', 'services'),
  ('media-marketing', 'Media & Marketing', 'services'),
  ('logistics-supply-chain', 'Logistics & Supply Chain', 'services'),
  ('real-estate-facilities', 'Real Estate & Facilities', 'services'),
  
  -- General
  ('consumer-retail', 'Consumer & Retail', 'general'),
  ('food-beverage', 'Food & Beverage', 'general'),
  ('telecommunications', 'Telecommunications', 'general'),
  ('government-public', 'Government & Public Sector', 'general'),
  ('non-profit', 'Non-Profit', 'general'),
  ('other', 'Other', 'general')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on lookup tables
ALTER TABLE public.lookup_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_focus_areas ENABLE ROW LEVEL SECURITY;

-- Create policies for read access
CREATE POLICY "lookup_sectors_read" ON public.lookup_sectors FOR SELECT USING (true);
CREATE POLICY "lookup_focus_areas_read" ON public.lookup_focus_areas FOR SELECT USING (true);