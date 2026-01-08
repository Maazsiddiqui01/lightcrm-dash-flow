-- 1. Add normalized name columns for matching
ALTER TABLE lg_horizons_companies ADD COLUMN IF NOT EXISTS parent_gp_name_normalized TEXT;
ALTER TABLE lg_horizons_gps ADD COLUMN IF NOT EXISTS gp_name_normalized TEXT;

-- 2. Create normalization function to standardize GP names
CREATE OR REPLACE FUNCTION normalize_gp_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF name IS NULL THEN RETURN NULL; END IF;
  -- Remove common suffixes, parenthetical notes, and standardize
  RETURN LOWER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(name, '\s*\([^)]*\)\s*', '', 'gi'),  -- Remove (notes)
        '\s*(LLC|Inc\.?|LP|L\.P\.|Management|Mgmt|Co\.?|Company|Partners|Capital|Group|Holdings|/The)\.*\s*$', '', 'gi'
      ),
      '\s+', ' ', 'g'  -- Normalize whitespace
    )
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Populate normalized columns
UPDATE lg_horizons_companies 
SET parent_gp_name_normalized = normalize_gp_name(parent_gp_name)
WHERE parent_gp_name IS NOT NULL;

UPDATE lg_horizons_gps 
SET gp_name_normalized = normalize_gp_name(gp_name)
WHERE gp_name IS NOT NULL;

-- 4. Add parent_gp_id column if not exists for FK relationship
ALTER TABLE lg_horizons_companies ADD COLUMN IF NOT EXISTS parent_gp_id UUID REFERENCES lg_horizons_gps(id);

-- 5. Update parent_gp_id where normalized names match
UPDATE lg_horizons_companies c
SET parent_gp_id = g.id
FROM lg_horizons_gps g
WHERE c.parent_gp_name_normalized = g.gp_name_normalized
  AND c.parent_gp_name_normalized IS NOT NULL
  AND c.parent_gp_id IS NULL;

-- 6. Create indexes for faster joins and lookups
CREATE INDEX IF NOT EXISTS idx_companies_parent_gp_normalized 
ON lg_horizons_companies(parent_gp_name_normalized);

CREATE INDEX IF NOT EXISTS idx_gps_name_normalized 
ON lg_horizons_gps(gp_name_normalized);

CREATE INDEX IF NOT EXISTS idx_companies_parent_gp_id 
ON lg_horizons_companies(parent_gp_id);