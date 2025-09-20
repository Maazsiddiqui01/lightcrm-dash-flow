-- Data standardization migration for focus areas
-- 1. Update Government / Public Sector to Government Services
-- 2. Merge HC: Non-Clinical Services & HC: Healthcare Services into HC: Services (Non-Clinical)
-- 3. Clean up any mis-listed opportunities

-- First, update the lookup_focus_areas table
UPDATE lookup_focus_areas 
SET label = 'Government Services' 
WHERE label = 'Government / Public Sector';

-- Remove HC: Healthcare Services as we're merging it into HC: Services (Non-Clinical)
-- But first let's update any references to it
UPDATE opportunities_raw 
SET lg_focus_area = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area IN ('HC: Healthcare Services', 'Healthcare Services');

-- Update contacts_raw focus area references
UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'HC: Healthcare Services', 'HC: Services (Non-Clinical)')
WHERE lg_focus_areas_comprehensive_list LIKE '%HC: Healthcare Services%';

UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Healthcare Services', 'HC: Services (Non-Clinical)')
WHERE lg_focus_areas_comprehensive_list LIKE '%Healthcare Services%';

-- Update individual focus area columns in contacts_raw
UPDATE contacts_raw SET lg_focus_area_1 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_1 IN ('HC: Healthcare Services', 'Healthcare Services');
UPDATE contacts_raw SET lg_focus_area_2 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_2 IN ('HC: Healthcare Services', 'Healthcare Services');
UPDATE contacts_raw SET lg_focus_area_3 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_3 IN ('HC: Healthcare Services', 'Healthcare Services');
UPDATE contacts_raw SET lg_focus_area_4 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_4 IN ('HC: Healthcare Services', 'Healthcare Services');
UPDATE contacts_raw SET lg_focus_area_5 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_5 IN ('HC: Healthcare Services', 'Healthcare Services');
UPDATE contacts_raw SET lg_focus_area_6 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_6 IN ('HC: Healthcare Services', 'Healthcare Services');
UPDATE contacts_raw SET lg_focus_area_7 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_7 IN ('HC: Healthcare Services', 'Healthcare Services');
UPDATE contacts_raw SET lg_focus_area_8 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_8 IN ('HC: Healthcare Services', 'Healthcare Services');

-- Update Government / Public Sector references
UPDATE opportunities_raw 
SET lg_focus_area = 'Government Services' 
WHERE lg_focus_area = 'Government / Public Sector';

UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Government / Public Sector', 'Government Services')
WHERE lg_focus_areas_comprehensive_list LIKE '%Government / Public Sector%';

-- Update individual focus area columns for government
UPDATE contacts_raw SET lg_focus_area_1 = 'Government Services' WHERE lg_focus_area_1 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_2 = 'Government Services' WHERE lg_focus_area_2 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_3 = 'Government Services' WHERE lg_focus_area_3 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_4 = 'Government Services' WHERE lg_focus_area_4 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_5 = 'Government Services' WHERE lg_focus_area_5 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_6 = 'Government Services' WHERE lg_focus_area_6 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_7 = 'Government Services' WHERE lg_focus_area_7 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_8 = 'Government Services' WHERE lg_focus_area_8 = 'Government / Public Sector';

-- Clean up potential mis-listings
-- Fix "Specialty Distribution" to "Distribution"
UPDATE opportunities_raw 
SET lg_focus_area = 'Distribution' 
WHERE lg_focus_area ILIKE '%specialty distribution%';

UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Specialty Distribution', 'Distribution')
WHERE lg_focus_areas_comprehensive_list LIKE '%Specialty Distribution%';

-- Fix "Payor & Employer Services" to "HC: Payor & Employer Services"
UPDATE opportunities_raw 
SET lg_focus_area = 'HC: Payor & Employer Services' 
WHERE lg_focus_area = 'Payor & Employer Services';

UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Payor & Employer Services', 'HC: Payor & Employer Services')
WHERE lg_focus_areas_comprehensive_list LIKE '%Payor & Employer Services%' 
AND lg_focus_areas_comprehensive_list NOT LIKE '%HC: Payor & Employer Services%';

-- Remove the old HC: Healthcare Services from lookup table
DELETE FROM lookup_focus_areas WHERE label = 'HC: Healthcare Services';

-- Update the lookup for Government Services to match the new label
UPDATE lookup_focus_areas 
SET label = 'Government Services' 
WHERE id = 'government-public-sector';

-- Add any missing standard focus areas that might be needed
INSERT INTO lookup_focus_areas (id, label, sector_id) 
VALUES ('distribution', 'Distribution', 'general')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

-- Ensure HC: Services (Non-Clinical) exists
INSERT INTO lookup_focus_areas (id, label, sector_id) 
VALUES ('hc-services-nonclinical', 'HC: Services (Non-Clinical)', 'healthcare')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;