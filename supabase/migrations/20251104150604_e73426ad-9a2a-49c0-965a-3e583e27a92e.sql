-- Sync missing focus areas from lg_focus_area_master to lookup_focus_areas
-- This ensures all active focus areas including "Electronic Components" are available in the UI dropdowns

INSERT INTO lookup_focus_areas (id, label, sector_id)
SELECT 
  gen_random_uuid() as id,
  m.focus_area as label,
  CASE 
    WHEN LOWER(m.sector) = 'industrials' THEN 'industrials'
    WHEN LOWER(m.sector) = 'healthcare' THEN 'healthcare'
    WHEN LOWER(m.sector) = 'services' THEN 'services'
    ELSE 'general'
  END as sector_id
FROM lg_focus_area_master m
WHERE m.is_active = true
  AND m.focus_area NOT IN (SELECT label FROM lookup_focus_areas)
ORDER BY m.focus_area;