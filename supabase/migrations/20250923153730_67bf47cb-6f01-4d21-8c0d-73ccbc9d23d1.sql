-- Remove HC: (All) from actual focus area data since it should be a virtual group selector
-- Clean up the lg_focus_area_master table
DELETE FROM public.lg_focus_area_master WHERE focus_area = 'HC: (All)';

-- Update any existing contact records that may have HC: (All) in their focus area fields
-- Replace with NULL since this should not be an actual focus area value
UPDATE public.contacts_raw 
SET lg_focus_area_1 = NULL 
WHERE lg_focus_area_1 = 'HC: (All)';

UPDATE public.contacts_raw 
SET lg_focus_area_2 = NULL 
WHERE lg_focus_area_2 = 'HC: (All)';

UPDATE public.contacts_raw 
SET lg_focus_area_3 = NULL 
WHERE lg_focus_area_3 = 'HC: (All)';

UPDATE public.contacts_raw 
SET lg_focus_area_4 = NULL 
WHERE lg_focus_area_4 = 'HC: (All)';

UPDATE public.contacts_raw 
SET lg_focus_area_5 = NULL 
WHERE lg_focus_area_5 = 'HC: (All)';

UPDATE public.contacts_raw 
SET lg_focus_area_6 = NULL 
WHERE lg_focus_area_6 = 'HC: (All)';

UPDATE public.contacts_raw 
SET lg_focus_area_7 = NULL 
WHERE lg_focus_area_7 = 'HC: (All)';

UPDATE public.contacts_raw 
SET lg_focus_area_8 = NULL 
WHERE lg_focus_area_8 = 'HC: (All)';

-- Update the comprehensive list field to remove HC: (All) entries
UPDATE public.contacts_raw 
SET lg_focus_areas_comprehensive_list = regexp_replace(
  regexp_replace(lg_focus_areas_comprehensive_list, 'HC: \(All\),?\s*', '', 'g'),
  ',\s*$', '', 'g'
)
WHERE lg_focus_areas_comprehensive_list LIKE '%HC: (All)%';

-- Clean up any opportunities that might have HC: (All)
UPDATE public.opportunities_raw
SET lg_focus_area = NULL
WHERE lg_focus_area = 'HC: (All)';