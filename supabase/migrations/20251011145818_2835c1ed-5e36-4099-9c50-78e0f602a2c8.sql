-- Normalize all date_of_origination values to year-only format
UPDATE opportunities_raw
SET date_of_origination = 
  CASE
    -- Extract year from "YYYY Q#" format (e.g., "2025 Q1" → "2025")
    WHEN date_of_origination ~ '^\d{4}\s+Q[1-4]$' THEN 
      substring(date_of_origination from '^\d{4}')
    
    -- Extract year from "Q# YYYY" format (e.g., "Q4 2025" → "2025")
    WHEN date_of_origination ~ '^Q[1-4]\s+\d{4}$' THEN 
      substring(date_of_origination from '\d{4}$')
    
    -- Keep year-only values as-is (e.g., "2025" → "2025")
    WHEN date_of_origination ~ '^\d{4}$' THEN 
      date_of_origination
    
    -- For quarter-only values like "Q2", we cannot determine year, set to NULL
    WHEN date_of_origination ~ '^Q[1-4]$' THEN 
      NULL
    
    -- Default: try to extract any 4-digit year, otherwise NULL
    ELSE 
      COALESCE(substring(date_of_origination from '\d{4}'), NULL)
  END
WHERE date_of_origination IS NOT NULL;