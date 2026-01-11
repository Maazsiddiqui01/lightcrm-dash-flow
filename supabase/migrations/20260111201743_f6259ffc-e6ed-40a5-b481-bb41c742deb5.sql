-- Fix gp_aum_numeric in companies table by recalculating from gp_aum (remove comma formatting issue)
UPDATE lg_horizons_companies
SET gp_aum_numeric = 
  CASE 
    WHEN gp_aum ~ '^[0-9,]+$' THEN 
      CAST(REPLACE(gp_aum, ',', '') AS NUMERIC)
    ELSE gp_aum_numeric
  END
WHERE gp_aum IS NOT NULL AND gp_aum ~ '^[0-9,]+$';

-- Sync gp_aum display format from linked GP's aum field (e.g., "7.8B" instead of "841,000,000")
UPDATE lg_horizons_companies c
SET gp_aum = g.aum,
    gp_aum_numeric = g.aum_numeric
FROM lg_horizons_gps g
WHERE c.parent_gp_id = g.id 
  AND g.aum IS NOT NULL;