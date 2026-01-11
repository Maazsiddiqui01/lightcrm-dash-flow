-- Fix GP AUM numeric values (they are off by 10x - e.g., "979.7M" stored as 9.79B instead of 979.7M)
-- Divide by 10 to correct the values

-- Fix lg_horizons_gps.aum_numeric (divide by 10)
UPDATE lg_horizons_gps 
SET aum_numeric = aum_numeric / 10 
WHERE aum_numeric IS NOT NULL;

-- Fix lg_horizons_companies.gp_aum_numeric (divide by 10)
UPDATE lg_horizons_companies 
SET gp_aum_numeric = gp_aum_numeric / 10 
WHERE gp_aum_numeric IS NOT NULL;

-- Create function to dynamically calculate active holdings count for a GP
-- This counts how many companies in lg_horizons_companies are linked to each GP
CREATE OR REPLACE FUNCTION get_gp_active_holdings_count(gp_id uuid)
RETURNS integer AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM lg_horizons_companies 
  WHERE parent_gp_id = gp_id;
$$ LANGUAGE sql STABLE;