-- Handle the duplicate constraint by first removing the old entries and keeping the new format
DELETE FROM public.lg_focus_area_master WHERE focus_area = 'HC: Non-Clinical Services';
DELETE FROM public.lookup_focus_areas WHERE label = 'HC: Non-Clinical Services';

-- Now update data tables to use the new format
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