-- Continue contacts data migration

-- Data Migration: Update contacts_raw comprehensive lists (comma-separated values)
-- This handles the lg_focus_areas_comprehensive_list field which contains comma-separated focus areas

-- Update Food & Agriculture in comprehensive lists
UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Food & Agriculture', 'Food Manufacturing')
WHERE lg_focus_areas_comprehensive_list LIKE '%Food & Agriculture%';

-- Update Healthcare Services in comprehensive lists
UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Healthcare Services', 'HC: Services (Non-Clinical)')
WHERE lg_focus_areas_comprehensive_list LIKE '%Healthcare Services%';

-- Update HC: Healthcare Services in comprehensive lists
UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'HC: Healthcare Services', 'HC: Services (Non-Clinical)')
WHERE lg_focus_areas_comprehensive_list LIKE '%HC: Healthcare Services%';

-- Update HC: Non-Clinical Services in comprehensive lists
UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'HC: Non-Clinical Services', 'HC: Services (Non-Clinical)')
WHERE lg_focus_areas_comprehensive_list LIKE '%HC: Non-Clinical Services%';

-- Update Government / Public Sector in comprehensive lists
UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Government / Public Sector', 'Government Services')
WHERE lg_focus_areas_comprehensive_list LIKE '%Government / Public Sector%';

-- Remove old focus areas from comprehensive lists
UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Food & Beverage Services', '')
WHERE lg_focus_areas_comprehensive_list LIKE '%Food & Beverage Services%';

UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'Human Capital', '')
WHERE lg_focus_areas_comprehensive_list LIKE '%Human Capital%';

-- Clean up any double commas or leading/trailing commas in comprehensive lists
UPDATE contacts_raw 
SET lg_focus_areas_comprehensive_list = TRIM(BOTH ',' FROM REPLACE(REPLACE(lg_focus_areas_comprehensive_list, ',,', ','), ', ,', ','))
WHERE lg_focus_areas_comprehensive_list IS NOT NULL;

-- Update individual focus area columns in contacts_raw
UPDATE contacts_raw SET lg_focus_area_1 = 'Food Manufacturing' WHERE lg_focus_area_1 = 'Food & Agriculture';
UPDATE contacts_raw SET lg_focus_area_2 = 'Food Manufacturing' WHERE lg_focus_area_2 = 'Food & Agriculture';
UPDATE contacts_raw SET lg_focus_area_3 = 'Food Manufacturing' WHERE lg_focus_area_3 = 'Food & Agriculture';
UPDATE contacts_raw SET lg_focus_area_4 = 'Food Manufacturing' WHERE lg_focus_area_4 = 'Food & Agriculture';
UPDATE contacts_raw SET lg_focus_area_5 = 'Food Manufacturing' WHERE lg_focus_area_5 = 'Food & Agriculture';
UPDATE contacts_raw SET lg_focus_area_6 = 'Food Manufacturing' WHERE lg_focus_area_6 = 'Food & Agriculture';
UPDATE contacts_raw SET lg_focus_area_7 = 'Food Manufacturing' WHERE lg_focus_area_7 = 'Food & Agriculture';
UPDATE contacts_raw SET lg_focus_area_8 = 'Food Manufacturing' WHERE lg_focus_area_8 = 'Food & Agriculture';

UPDATE contacts_raw SET lg_focus_area_1 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_1 IN ('Healthcare Services', 'HC: Healthcare Services', 'HC: Non-Clinical Services');
UPDATE contacts_raw SET lg_focus_area_2 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_2 IN ('Healthcare Services', 'HC: Healthcare Services', 'HC: Non-Clinical Services');
UPDATE contacts_raw SET lg_focus_area_3 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_3 IN ('Healthcare Services', 'HC: Healthcare Services', 'HC: Non-Clinical Services');
UPDATE contacts_raw SET lg_focus_area_4 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_4 IN ('Healthcare Services', 'HC: Healthcare Services', 'HC: Non-Clinical Services');
UPDATE contacts_raw SET lg_focus_area_5 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_5 IN ('Healthcare Services', 'HC: Healthcare Services', 'HC: Non-Clinical Services');
UPDATE contacts_raw SET lg_focus_area_6 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_6 IN ('Healthcare Services', 'HC: Healthcare Services', 'HC: Non-Clinical Services');
UPDATE contacts_raw SET lg_focus_area_7 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_7 IN ('Healthcare Services', 'HC: Healthcare Services', 'HC: Non-Clinical Services');
UPDATE contacts_raw SET lg_focus_area_8 = 'HC: Services (Non-Clinical)' WHERE lg_focus_area_8 IN ('Healthcare Services', 'HC: Healthcare Services', 'HC: Non-Clinical Services');

UPDATE contacts_raw SET lg_focus_area_1 = 'Government Services' WHERE lg_focus_area_1 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_2 = 'Government Services' WHERE lg_focus_area_2 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_3 = 'Government Services' WHERE lg_focus_area_3 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_4 = 'Government Services' WHERE lg_focus_area_4 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_5 = 'Government Services' WHERE lg_focus_area_5 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_6 = 'Government Services' WHERE lg_focus_area_6 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_7 = 'Government Services' WHERE lg_focus_area_7 = 'Government / Public Sector';
UPDATE contacts_raw SET lg_focus_area_8 = 'Government Services' WHERE lg_focus_area_8 = 'Government / Public Sector';

-- Remove old focus areas from individual columns
UPDATE contacts_raw SET lg_focus_area_1 = NULL WHERE lg_focus_area_1 IN ('Food & Beverage Services', 'Human Capital');
UPDATE contacts_raw SET lg_focus_area_2 = NULL WHERE lg_focus_area_2 IN ('Food & Beverage Services', 'Human Capital');
UPDATE contacts_raw SET lg_focus_area_3 = NULL WHERE lg_focus_area_3 IN ('Food & Beverage Services', 'Human Capital');
UPDATE contacts_raw SET lg_focus_area_4 = NULL WHERE lg_focus_area_4 IN ('Food & Beverage Services', 'Human Capital');
UPDATE contacts_raw SET lg_focus_area_5 = NULL WHERE lg_focus_area_5 IN ('Food & Beverage Services', 'Human Capital');
UPDATE contacts_raw SET lg_focus_area_6 = NULL WHERE lg_focus_area_6 IN ('Food & Beverage Services', 'Human Capital');
UPDATE contacts_raw SET lg_focus_area_7 = NULL WHERE lg_focus_area_7 IN ('Food & Beverage Services', 'Human Capital');
UPDATE contacts_raw SET lg_focus_area_8 = NULL WHERE lg_focus_area_8 IN ('Food & Beverage Services', 'Human Capital');