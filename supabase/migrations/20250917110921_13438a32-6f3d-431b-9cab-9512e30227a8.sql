-- Update Aerospace & Defense to A&D to match actual data values
UPDATE public.lookup_focus_areas 
SET label = 'A&D' 
WHERE id = 'aerospace-defense' AND label = 'Aerospace & Defense';