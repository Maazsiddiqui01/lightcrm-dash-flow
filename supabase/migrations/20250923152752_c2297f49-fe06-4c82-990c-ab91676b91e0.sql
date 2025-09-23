-- Standardize focus area values across the system
-- This migration will clean up inconsistencies in focus area naming

-- First, let's update contacts_raw to use consistent focus area names
UPDATE contacts_raw SET lg_focus_area_1 = 'Capital Goods / Equipment' WHERE lg_focus_area_1 = 'Capital Goods';
UPDATE contacts_raw SET lg_focus_area_2 = 'Capital Goods / Equipment' WHERE lg_focus_area_2 = 'Capital Goods';
UPDATE contacts_raw SET lg_focus_area_3 = 'Capital Goods / Equipment' WHERE lg_focus_area_3 = 'Capital Goods';
UPDATE contacts_raw SET lg_focus_area_4 = 'Capital Goods / Equipment' WHERE lg_focus_area_4 = 'Capital Goods';
UPDATE contacts_raw SET lg_focus_area_5 = 'Capital Goods / Equipment' WHERE lg_focus_area_5 = 'Capital Goods';
UPDATE contacts_raw SET lg_focus_area_6 = 'Capital Goods / Equipment' WHERE lg_focus_area_6 = 'Capital Goods';
UPDATE contacts_raw SET lg_focus_area_7 = 'Capital Goods / Equipment' WHERE lg_focus_area_7 = 'Capital Goods';
UPDATE contacts_raw SET lg_focus_area_8 = 'Capital Goods / Equipment' WHERE lg_focus_area_8 = 'Capital Goods';

UPDATE contacts_raw SET lg_focus_area_1 = 'Waste & Environmental Services' WHERE lg_focus_area_1 = 'Waste & Enviro Services';
UPDATE contacts_raw SET lg_focus_area_2 = 'Waste & Environmental Services' WHERE lg_focus_area_2 = 'Waste & Enviro Services';
UPDATE contacts_raw SET lg_focus_area_3 = 'Waste & Environmental Services' WHERE lg_focus_area_3 = 'Waste & Enviro Services';
UPDATE contacts_raw SET lg_focus_area_4 = 'Waste & Environmental Services' WHERE lg_focus_area_4 = 'Waste & Enviro Services';
UPDATE contacts_raw SET lg_focus_area_5 = 'Waste & Environmental Services' WHERE lg_focus_area_5 = 'Waste & Enviro Services';
UPDATE contacts_raw SET lg_focus_area_6 = 'Waste & Environmental Services' WHERE lg_focus_area_6 = 'Waste & Enviro Services';
UPDATE contacts_raw SET lg_focus_area_7 = 'Waste & Environmental Services' WHERE lg_focus_area_7 = 'Waste & Enviro Services';
UPDATE contacts_raw SET lg_focus_area_8 = 'Waste & Environmental Services' WHERE lg_focus_area_8 = 'Waste & Enviro Services';

-- Update comprehensive list to use consistent naming
UPDATE contacts_raw SET 
  lg_focus_areas_comprehensive_list = REPLACE(
    REPLACE(lg_focus_areas_comprehensive_list, 'Capital Goods,', 'Capital Goods / Equipment,'),
    'Capital Goods', 'Capital Goods / Equipment'
  )
WHERE lg_focus_areas_comprehensive_list LIKE '%Capital Goods%'
  AND lg_focus_areas_comprehensive_list NOT LIKE '%Capital Goods / Equipment%';

UPDATE contacts_raw SET 
  lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Waste & Enviro Services', 'Waste & Environmental Services')
WHERE lg_focus_areas_comprehensive_list LIKE '%Waste & Enviro Services%';

-- Add missing focus areas from opportunities to lg_focus_area_master if they don't exist
INSERT INTO lg_focus_area_master (focus_area, sector, is_active)
SELECT 'HC: Payor & Employer Services', 'Healthcare', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'HC: Payor & Employer Services');

INSERT INTO lg_focus_area_master (focus_area, sector, is_active)
SELECT 'HC: Revenue Cycle Management', 'Healthcare', true
WHERE NOT EXISTS (SELECT 1 FROM lg_focus_area_master WHERE focus_area = 'HC: Revenue Cycle Management');

-- Create a view that provides all distinct focus areas from both contacts and opportunities
CREATE OR REPLACE VIEW ui_distinct_focus_areas_v AS
WITH all_focus_areas AS (
  -- From lg_focus_area_master (canonical source)
  SELECT focus_area FROM lg_focus_area_master WHERE is_active = true
  
  UNION
  
  -- From opportunities 
  SELECT DISTINCT lg_focus_area as focus_area 
  FROM opportunities_raw 
  WHERE lg_focus_area IS NOT NULL 
    AND trim(lg_focus_area) != ''
  
  UNION
  
  -- From contacts individual fields
  SELECT DISTINCT lg_focus_area_1 as focus_area FROM contacts_raw WHERE lg_focus_area_1 IS NOT NULL AND trim(lg_focus_area_1) != ''
  UNION
  SELECT DISTINCT lg_focus_area_2 as focus_area FROM contacts_raw WHERE lg_focus_area_2 IS NOT NULL AND trim(lg_focus_area_2) != ''
  UNION
  SELECT DISTINCT lg_focus_area_3 as focus_area FROM contacts_raw WHERE lg_focus_area_3 IS NOT NULL AND trim(lg_focus_area_3) != ''
  UNION
  SELECT DISTINCT lg_focus_area_4 as focus_area FROM contacts_raw WHERE lg_focus_area_4 IS NOT NULL AND trim(lg_focus_area_4) != ''
  UNION
  SELECT DISTINCT lg_focus_area_5 as focus_area FROM contacts_raw WHERE lg_focus_area_5 IS NOT NULL AND trim(lg_focus_area_5) != ''
  UNION
  SELECT DISTINCT lg_focus_area_6 as focus_area FROM contacts_raw WHERE lg_focus_area_6 IS NOT NULL AND trim(lg_focus_area_6) != ''
  UNION
  SELECT DISTINCT lg_focus_area_7 as focus_area FROM contacts_raw WHERE lg_focus_area_7 IS NOT NULL AND trim(lg_focus_area_7) != ''
  UNION
  SELECT DISTINCT lg_focus_area_8 as focus_area FROM contacts_raw WHERE lg_focus_area_8 IS NOT NULL AND trim(lg_focus_area_8) != ''
  
  UNION
  
  -- From contacts comprehensive list (split by comma)
  SELECT DISTINCT trim(unnest(string_to_array(lg_focus_areas_comprehensive_list, ','))) as focus_area
  FROM contacts_raw 
  WHERE lg_focus_areas_comprehensive_list IS NOT NULL 
    AND trim(lg_focus_areas_comprehensive_list) != ''
)
SELECT focus_area 
FROM all_focus_areas 
WHERE focus_area IS NOT NULL 
  AND trim(focus_area) != '';

-- Grant access to the view
GRANT SELECT ON ui_distinct_focus_areas_v TO authenticated;
GRANT SELECT ON ui_distinct_focus_areas_v TO anon;