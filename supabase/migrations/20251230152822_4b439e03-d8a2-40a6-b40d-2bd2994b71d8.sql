-- Add "Property Management" to lookup_focus_areas
INSERT INTO public.lookup_focus_areas (id, label, sector_id)
VALUES ('property-management', 'Property Management', 'services')
ON CONFLICT (id) DO NOTHING;