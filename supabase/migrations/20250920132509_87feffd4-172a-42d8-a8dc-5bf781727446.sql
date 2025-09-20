-- LG Focus Areas Master List and Data Migration (Fixed)

-- First, add new focus areas to the master list (using simpler approach)
INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'A&D', 'Various', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'A&D');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'Food Manufacturing', 'Consumer', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'Food Manufacturing');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'HC: (All)', 'Healthcare', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'HC: (All)');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'Industrial Services', 'Industrial', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'Industrial Services');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'Industrial Technology', 'Technology', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'Industrial Technology');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'Insurance Services / Wealth Management', 'Financial Services', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'Insurance Services / Wealth Management');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'Life Sciences', 'Healthcare', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'Life Sciences');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'Electronic Components', 'Technology', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'Electronic Components');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'Engineering Services', 'Industrial', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'Engineering Services');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'HC: Services (Clinical)', 'Healthcare', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'HC: Services (Clinical)');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'Distribution', 'Various', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'Distribution');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active) 
SELECT 'HC: Services (Non-Clinical)', 'Healthcare', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'HC: Services (Non-Clinical)');

-- Deactivate removed focus areas
UPDATE lg_focus_area_master 
SET is_active = false 
WHERE focus_area IN ('Food & Agriculture', 'Food & Beverage Services', 'Human Capital');

-- Update Government / Public Sector to Government Services if it exists
UPDATE lg_focus_area_master 
SET focus_area = 'Government Services' 
WHERE focus_area = 'Government / Public Sector';

-- Data Migration: Update opportunities_raw
-- 1. Update Food & Agriculture opportunities (reclassify to Food Manufacturing)
UPDATE opportunities_raw 
SET lg_focus_area = 'Food Manufacturing' 
WHERE lg_focus_area = 'Food & Agriculture';

-- 2. Update Healthcare Services to HC: Services (Non-Clinical)
UPDATE opportunities_raw 
SET lg_focus_area = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area = 'Healthcare Services';

-- 3. Update HC: Healthcare Services to HC: Services (Non-Clinical)
UPDATE opportunities_raw 
SET lg_focus_area = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area = 'HC: Healthcare Services';

-- 4. Update HC: Non-Clinical Services to HC: Services (Non-Clinical)
UPDATE opportunities_raw 
SET lg_focus_area = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area = 'HC: Non-Clinical Services';

-- 5. Update Specialty Distribution to Distribution
UPDATE opportunities_raw 
SET lg_focus_area = 'Distribution' 
WHERE lg_focus_area ILIKE '%specialty distribution%';

-- 6. Update Payor & Employer Services to HC: Payor & Employer Services
UPDATE opportunities_raw 
SET lg_focus_area = 'HC: Payor & Employer Services' 
WHERE lg_focus_area = 'Payor & Employer Services';

-- 7. Update Government / Public Sector to Government Services in opportunities
UPDATE opportunities_raw 
SET lg_focus_area = 'Government Services' 
WHERE lg_focus_area = 'Government / Public Sector';