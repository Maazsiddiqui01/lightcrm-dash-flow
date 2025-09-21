-- Remove duplicates from lookup table and update the data
DELETE FROM public.lookup_focus_areas 
WHERE label = 'HC: Services (Non-Clinical)';

-- Now update HC: Non-Clinical Services to HC: Services (Non-Clinical) across all tables
UPDATE public.contacts_raw 
SET lg_focus_area_1 = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area_1 = 'HC: Non-Clinical Services';

UPDATE public.contacts_raw 
SET lg_focus_area_2 = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area_2 = 'HC: Non-Clinical Services';

UPDATE public.contacts_raw 
SET lg_focus_area_3 = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area_3 = 'HC: Non-Clinical Services';

UPDATE public.contacts_raw 
SET lg_focus_area_4 = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area_4 = 'HC: Non-Clinical Services';

UPDATE public.contacts_raw 
SET lg_focus_area_5 = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area_5 = 'HC: Non-Clinical Services';

UPDATE public.contacts_raw 
SET lg_focus_area_6 = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area_6 = 'HC: Non-Clinical Services';

UPDATE public.contacts_raw 
SET lg_focus_area_7 = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area_7 = 'HC: Non-Clinical Services';

UPDATE public.contacts_raw 
SET lg_focus_area_8 = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area_8 = 'HC: Non-Clinical Services';

-- Update comprehensive list 
UPDATE public.contacts_raw 
SET lg_focus_areas_comprehensive_list = REPLACE(lg_focus_areas_comprehensive_list, 'HC: Non-Clinical Services', 'HC: Services (Non-Clinical)')
WHERE lg_focus_areas_comprehensive_list LIKE '%HC: Non-Clinical Services%';

-- Update opportunities table if it has focus area references
UPDATE public.opportunities_raw 
SET lg_focus_area = 'HC: Services (Non-Clinical)' 
WHERE lg_focus_area = 'HC: Non-Clinical Services';

-- Update master focus area table 
UPDATE public.lg_focus_area_master 
SET focus_area = 'HC: Services (Non-Clinical)' 
WHERE focus_area = 'HC: Non-Clinical Services';

-- Update lookup table by updating the old entry
UPDATE public.lookup_focus_areas 
SET label = 'HC: Services (Non-Clinical)' 
WHERE label = 'HC: Non-Clinical Services';