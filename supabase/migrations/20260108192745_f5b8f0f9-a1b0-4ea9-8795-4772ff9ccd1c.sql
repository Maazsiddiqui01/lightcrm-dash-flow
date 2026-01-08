-- Parse EBITDA into numeric (handles $, €, commas, periods as thousand separators, M/B suffixes)
UPDATE lg_horizons_companies 
SET ebitda_numeric = 
  CASE 
    WHEN ebitda IS NULL OR TRIM(ebitda) = '' OR ebitda = '-' THEN NULL
    WHEN ebitda ILIKE '%B%' THEN 
      CAST(NULLIF(REGEXP_REPLACE(ebitda, '[^0-9]', '', 'g'), '') AS NUMERIC) * 1000000000
    WHEN ebitda ILIKE '%M%' THEN 
      CAST(NULLIF(REGEXP_REPLACE(ebitda, '[^0-9]', '', 'g'), '') AS NUMERIC) * 1000000
    ELSE 
      CAST(NULLIF(REGEXP_REPLACE(ebitda, '[^0-9]', '', 'g'), '') AS NUMERIC)
  END
WHERE ebitda IS NOT NULL AND TRIM(ebitda) != '' AND ebitda != '-';

-- Parse Revenue into numeric
UPDATE lg_horizons_companies 
SET revenue_numeric = 
  CASE 
    WHEN revenue IS NULL OR TRIM(revenue) = '' OR revenue = '-' THEN NULL
    WHEN revenue ILIKE '%B%' THEN 
      CAST(NULLIF(REGEXP_REPLACE(revenue, '[^0-9]', '', 'g'), '') AS NUMERIC) * 1000000000
    WHEN revenue ILIKE '%M%' THEN 
      CAST(NULLIF(REGEXP_REPLACE(revenue, '[^0-9]', '', 'g'), '') AS NUMERIC) * 1000000
    ELSE 
      CAST(NULLIF(REGEXP_REPLACE(revenue, '[^0-9]', '', 'g'), '') AS NUMERIC)
  END
WHERE revenue IS NOT NULL AND TRIM(revenue) != '' AND revenue != '-';

-- Parse GP AUM for companies into numeric
UPDATE lg_horizons_companies 
SET gp_aum_numeric = 
  CASE 
    WHEN gp_aum IS NULL OR TRIM(gp_aum) = '' OR gp_aum = '-' THEN NULL
    WHEN gp_aum ILIKE '%B%' THEN 
      CAST(NULLIF(REGEXP_REPLACE(gp_aum, '[^0-9]', '', 'g'), '') AS NUMERIC) * 1000000000
    WHEN gp_aum ILIKE '%M%' THEN 
      CAST(NULLIF(REGEXP_REPLACE(gp_aum, '[^0-9]', '', 'g'), '') AS NUMERIC) * 1000000
    ELSE 
      CAST(NULLIF(REGEXP_REPLACE(gp_aum, '[^0-9]', '', 'g'), '') AS NUMERIC)
  END
WHERE gp_aum IS NOT NULL AND TRIM(gp_aum) != '' AND gp_aum != '-';

-- Parse AUM for GPs into numeric
UPDATE lg_horizons_gps 
SET aum_numeric = 
  CASE 
    WHEN aum IS NULL OR TRIM(aum) = '' OR aum = '-' THEN NULL
    WHEN aum ILIKE '%B%' THEN 
      CAST(NULLIF(REGEXP_REPLACE(aum, '[^0-9]', '', 'g'), '') AS NUMERIC) * 1000000000
    WHEN aum ILIKE '%M%' THEN 
      CAST(NULLIF(REGEXP_REPLACE(aum, '[^0-9]', '', 'g'), '') AS NUMERIC) * 1000000
    ELSE 
      CAST(NULLIF(REGEXP_REPLACE(aum, '[^0-9]', '', 'g'), '') AS NUMERIC)
  END
WHERE aum IS NOT NULL AND TRIM(aum) != '' AND aum != '-';

-- Add "No Known Process" to lookup table if not exists
INSERT INTO lookup_horizon_process_status (value, label, sort_order) 
VALUES ('No Known Process', 'No Known Process', 5)
ON CONFLICT (value) DO NOTHING;

-- Update NULL/empty/invalid process statuses to "No Known Process"
UPDATE lg_horizons_companies 
SET process_status = 'No Known Process'
WHERE process_status IS NULL 
   OR TRIM(process_status) = '' 
   OR process_status = '-'
   OR process_status NOT IN ('Expected / Monitoring', 'Failed Process', 'Active Process', 'Pulled / On Hold', 'No Known Process');