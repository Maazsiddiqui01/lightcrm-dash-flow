-- Create lookup tables for sectors and focus areas

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

-- Insert focus areas with proper sector mapping
INSERT INTO public.lookup_focus_areas (id, label, sector_id) VALUES
  -- General
  ('business-services','Business Services','general'),
  ('consumer-services','Consumer Services','general'),
  ('education','Education','general'),
  ('financial-services','Financial Services','general'),
  ('government-public-sector','Government / Public Sector','general'),
  ('media-marketing','Media & Marketing','general'),
  ('real-estate','Real Estate','general'),
  ('retail-consumer','Retail & Consumer','general'),
  ('software-technology','Software & Technology','general'),
  ('telecommunications','Telecommunications','general'),
  ('transportation-logistics','Transportation & Logistics','general'),
  
  -- Healthcare
  ('hc-behavioral-health','HC: Behavioral Health','healthcare'),
  ('hc-clinical-solutions','HC: Clinical Solutions','healthcare'),
  ('hc-digital-health','HC: Digital Health','healthcare'),
  ('hc-healthcare-it','HC: Healthcare IT','healthcare'),
  ('hc-healthcare-services','HC: Healthcare Services','healthcare'),
  ('hc-life-sciences','HC: Life Sciences','healthcare'),
  ('hc-medical-devices','HC: Medical Devices','healthcare'),
  ('hc-nonclinical','HC: Non-Clinical Services','healthcare'),
  ('hc-payor-employer','HC: Payor & Employer Services','healthcare'),
  ('hc-population-health','HC: Population Health','healthcare'),
  ('hc-rcm','HC: Revenue Cycle Management','healthcare'),
  
  -- Industrials
  ('aerospace-defense','Aerospace & Defense','industrials'),
  ('automotive','Automotive','industrials'),
  ('building-materials','Building Materials','industrials'),
  ('capital-goods-equipment','Capital Goods / Equipment','industrials'),
  ('chemicals','Chemicals','industrials'),
  ('construction','Construction','industrials'),
  ('energy','Energy','industrials'),
  ('food-agriculture','Food & Agriculture','industrials'),  
  ('manufacturing','Manufacturing','industrials'),
  ('mining','Mining','industrials'),
  
  -- Services
  ('facilities-management','Facilities Management','services'),
  ('food-beverage-services','Food & Beverage Services','services'),
  ('hospitality','Hospitality','services'),
  ('human-capital','Human Capital','services'),
  ('professional-services','Professional Services','services'),
  ('security-services','Security Services','services'),
  ('staffing','Staffing','services'),
  ('waste-environmental','Waste & Environmental Services','services')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on lookup tables
ALTER TABLE public.lookup_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lookup_focus_areas ENABLE ROW LEVEL SECURITY;

-- Create policies to allow read access
CREATE POLICY "lookup_sectors_read" ON public.lookup_sectors FOR SELECT USING (true);
CREATE POLICY "lookup_focus_areas_read" ON public.lookup_focus_areas FOR SELECT USING (true);