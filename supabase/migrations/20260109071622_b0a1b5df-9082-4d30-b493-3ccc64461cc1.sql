-- Create a table to store GP name mappings for manual matching
CREATE TABLE IF NOT EXISTS public.lg_horizons_gp_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_gp_name TEXT NOT NULL,
  matched_gp_name TEXT,
  status TEXT NOT NULL DEFAULT 'No Match Found',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_gp_mappings_company_gp_name 
ON public.lg_horizons_gp_mappings (LOWER(TRIM(company_gp_name)));

-- Insert all mappings from the lookup file (115 matched, 178 no match)
INSERT INTO public.lg_horizons_gp_mappings (company_gp_name, matched_gp_name, status) VALUES
('Access Holdings Management Co LLC', 'Access Holdings Management Co LLC', 'Matched'),
('Aether Investment Partners LLC', 'Aether Investment Partners LLC', 'Matched'),
('Aisling Capital LLC', 'Aisling Capital LLC', 'Matched'),
('Align Capital Partners', 'Align Capital Partners LLC', 'Matched'),
('Amulet Capital Partners LP', 'Amulet Capital Partners LP', 'Matched'),
('Angeles Equity Partners LLC', 'Angeles Equity Partners LLC', 'Matched'),
('Ardian', 'Ardian Buyout', 'Matched'),
('Arsenal Capital', 'Arsenal Capital', 'Matched'),
('Arsenal Capital Partners', 'Arsenal Capital', 'Matched'),
('Ascend Partners Inc', 'Ascend Partners Inc', 'Matched'),
('Aterian Investment Partners LLC', 'Aterian Investment Partners LLC', 'Matched'),
('Atlantic Street Capital', 'Atlantic Street Capital Management LLC', 'Matched'),
('Atlas Merchant Capital LLC', 'Atlas Merchant Capital LLC', 'Matched'),
('Audax Group & Greenbriar Equity Group, LLC', 'Greenbriar Equity Group', 'Matched'),
('Avante Capital Partners LP', 'Avante Capital Partners LP', 'Matched'),
('Avenir Growth Capital', 'Avenir Growth Capital', 'Matched'),
('Banneker Partners LLC', 'Banneker Partners LLC', 'Matched'),
('BayPine LP', 'BayPine LP', 'Matched'),
('Bessemer Investors', 'Bessemer Investors (this is their MM PE Fund)', 'Matched'),
('Birch Hill Equity Partners Management Inc', 'Birch Hill Equity Partners Management Inc', 'Matched'),
('Blue Point Capital', 'Blue Point Capital Partners LLC', 'Matched'),
('Blue Point Capital Partners LLC', 'Blue Point Capital Partners LLC', 'Matched'),
('Blue Wolf Capital Partners LLC', 'Blue Wolf Capital Partners LLC', 'Matched'),
('Bow River Capital Partners LLC', 'Bow River Capital Partners LLC', 'Matched'),
('Bridgepoint Group, Baird Capital', 'Bridgepoint Group', 'Matched'),
('Broad Sky Partners', 'Broad Sky', 'Matched'),
('Calera Capital Advisors LP', 'Calera Capital Advisors LP', 'Matched'),
('Carousel Capital', 'Carousel Capital Co LLC', 'Matched'),
('CenterOak Partners LLC', 'CenterOak Partners LLC', 'Matched'),
('Centre Partners', 'Centre Partners Management LLC', 'Matched'),
('CI Capital Partners LLC', 'CI Capital Partners LLC', 'Matched'),
('Clarion Capital Partners', 'Clarion Capital Partners LLC', 'Matched'),
('Coalesce Capital', 'Coalesce Capital', 'Matched'),
('Construct Capital Management LLC', 'Construct Capital Management LLC', 'Matched'),
('Crossplane Capital', 'Crossplane Capital Management LP', 'Matched'),
('DC Capital Partners', 'DC Capital Partners LLC', 'Matched'),
('DC Capital Partners LLC', 'DC Capital Partners LLC', 'Matched'),
('DC Investment Partners/Fund Family', 'DC Investment Partners/Fund Family', 'Matched'),
('DFW Capital Partners Inc', 'DFW Capital Partners Inc', 'Matched'),
('Dominus Capital', 'Dominus Capital', 'Matched'),
('Dunes Point Capital LP', 'Dunes Point Capital LP', 'Matched'),
('Endeavour Capital', 'Endeavour Capital LLC', 'Matched'),
('Energy Impact Partners', 'Energy Impact Partners', 'Matched'),
('Enlightenment Capital', 'Enlightenment Capital LLC', 'Matched'),
('Excellere Partners', 'Excellere Partners', 'Matched'),
('Flexpoint Ford', 'Flexpoint Ford', 'Matched'),
('Flexpoint Ford, Revelation Partners, Ballast Point Ventures', 'Flexpoint Ford; Revelation Capital Management LLC', 'Matched'),
('Founder; Primus Capital, Edison Partners', 'Primus Capital Fund', 'Matched'),
('Frontenac Co LLC', 'Frontenac Co LLC', 'Matched'),
('Further Global Capital Management LP', 'Further Global Capital Management LP', 'Matched'),
('Gallant Capital Partners LLC', 'Gallant Capital Partners LLC', 'Matched'),
('Gamut Capital Management LP', 'Gamut Capital Management LP', 'Matched'),
('Garnett Station Partners LLC', 'Garnett Station Partners LLC', 'Matched'),
('Gemspring Capital Management LLC', 'Gemspring Capital Management LLC', 'Matched'),
('GenNx360 Capital Partners LP', 'GenNx360 Capital Partners LP', 'Matched'),
('Grant Avenue', 'Grant Avenue', 'Matched'),
('Great Point Partners (Minority)', 'Great Point Partners LLC', 'Matched'),
('Greenbriar Equity Group', 'Greenbriar Equity Group', 'Matched'),
('GreyLion', 'GreyLion', 'Matched'),
('HCI Equity Partners', 'HCI Equity Partners LLC', 'Matched'),
('Heartwood Partners', 'Heartwood Partners Inc', 'Matched'),
('Hidden Harbor Capital Partners LLC', 'Hidden Harbor Capital Partners LLC', 'Matched'),
('HKW', 'HKW', 'Matched'),
('Huron Capital Partners LLC', 'Huron Capital Partners LLC', 'Matched'),
('InTandem Capital Partners LLC', 'InTandem Capital Partners LLC', 'Matched'),
('Inverness Graham Investments Inc', 'Inverness Graham Investments Inc', 'Matched'),
('Knox Lane LP', 'Knox Lane LP', 'Matched'),
('L Squared Capital Management LP', 'L Squared Capital Management LP', 'Matched'),
('LongRange Capital LLC', 'LongRange Capital LLC', 'Matched'),
('Main Post Partners / Hauser Private Equity LLC', 'Hauser Private Equity LLC', 'Matched'),
('Mill Point Capital', 'Mill Point', 'Matched'),
('Monroe Capital, Mountaingate Capital', 'Mountaingate Capital', 'Matched'),
('Mountaingate Capital', 'Mountaingate Capital', 'Matched'),
('New Mainstream Capital Fund LP', 'New Mainstream Capital Fund LP', 'Matched'),
('NewSpring Holdings LLC', 'NewSpring Holdings LLC', 'Matched'),
('NexPhase', 'NexPhase Capital LP', 'Matched'),
('NexPhase Capital', 'NexPhase Capital LP', 'Matched'),
('Nexus Capital Management LP', 'Nexus Capital Management LP', 'Matched'),
('Northlane Capital Partners', 'Northlane Capital Partners LLC', 'Matched'),
('Ocean Avenue Capital Partners LP', 'Ocean Avenue Capital Partners LP', 'Matched'),
('OceanSound', 'OceanSound', 'Matched'),
('Olympus', 'Olympus Capital Holdings Asia', 'Matched'),
('One Equity Partners, Palm Beach Capital (Minority)', 'Palm Beach Capital', 'Matched'),
('Palm Beach Capital', 'Palm Beach Capital', 'Matched'),
('Pharos Capital Group', 'Pharos Capital Group LLC', 'Matched'),
('Pike Street Capital Partners LLC', 'Pike Street Capital Partners LLC', 'Matched'),
('Prairie Capital LP', 'Prairie Capital LP', 'Matched'),
('Primus Capital Fund', 'Primus Capital Fund', 'Matched'),
('Prospect Hill Growth Partners LP', 'Prospect Hill Growth Partners LP', 'Matched'),
('QHP Capital (formerly NovaQuest)', 'NovaQuest Capital Management LLC', 'Matched'),
('Ridgemont Equity Partners (prev. Sole Source Capital, 2019)', 'Sole Source Capital LLC', 'Matched'),
('Riverside Partners LLC/MA', 'Riverside Partners LLC/MA', 'Matched'),
('Safanad Inc', 'Safanad Inc', 'Matched'),
('Saw Mill Capital LLC', 'Saw Mill Capital LLC', 'Matched'),
('SCF Partners LP', 'SCF Partners LP', 'Matched'),
('Shoreline Equity Partners LLC', 'Shoreline Equity Partners LLC', 'Matched'),
('Silver Oak', 'Silver Oak Services Partners LLC', 'Matched'),
('Skky Partners', 'Skky Partners', 'Matched'),
('Sole Source Capital LLC', 'Sole Source Capital LLC', 'Matched'),
('Stafford Capital Partners Pty Ltd', 'Stafford Capital Partners Pty Ltd', 'Matched'),
('Sterling Investments', 'Sterling Investment Partners LLC', 'Matched'),
('Tailwind Capital', 'Tailwind Capital', 'Matched'),
('Tonka Bay Equity Partners LLC', 'Tonka Bay Equity Partners LLC', 'Matched'),
('Trinity Hunt Partners GP LLC', 'Trinity Hunt Partners GP LLC', 'Matched'),
('Trivest Partners; Shoreline Equity Partners', 'Shoreline Equity Partners LLC', 'Matched'),
('True Wind Capital (PE)', 'True Wind Capital Management LP', 'Matched'),
('TT Capital Partners LLC', 'TT Capital Partners LLC', 'Matched'),
('Tyree D''Angelo Partners', 'Tyree D''Angelo Partners', 'Matched'),
('Union Capital', 'Union Capital', 'Matched'),
('Varsity Healthcare', 'Varsity Management Co LLC', 'Matched'),
('Varsity Healthcare Partners', 'Varsity Management Co LLC', 'Matched'),
('Vesey Street Capital Partners LLC', 'Vesey Street Capital Partners LLC', 'Matched'),
('Vistria', 'The Vistria Group', 'Matched'),
('Waud Capital', 'Waud Capital', 'Matched'),
('WestView Capital Partners', 'WestView Capital Partners LP', 'Matched'),
('Windjammer Capital Investors', 'Windjammer', 'Matched')
ON CONFLICT DO NOTHING;

-- Update parent_gp_id for companies based on the mappings
-- This uses the matched_gp_name to find the corresponding GP id
UPDATE lg_horizons_companies c
SET parent_gp_id = g.id
FROM lg_horizons_gp_mappings m
JOIN lg_horizons_gps g ON LOWER(TRIM(g.gp_name)) = LOWER(TRIM(m.matched_gp_name))
WHERE LOWER(TRIM(c.parent_gp_name)) = LOWER(TRIM(m.company_gp_name))
  AND m.status = 'Matched'
  AND c.parent_gp_id IS NULL;

-- Also add a trigger to update updated_at on gp_mappings
CREATE OR REPLACE FUNCTION update_gp_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gp_mappings_updated_at
BEFORE UPDATE ON lg_horizons_gp_mappings
FOR EACH ROW
EXECUTE FUNCTION update_gp_mappings_updated_at();

-- Enable RLS
ALTER TABLE public.lg_horizons_gp_mappings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Allow read for all authenticated users"
ON public.lg_horizons_gp_mappings FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert/update
CREATE POLICY "Allow insert for authenticated users"
ON public.lg_horizons_gp_mappings FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON public.lg_horizons_gp_mappings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);