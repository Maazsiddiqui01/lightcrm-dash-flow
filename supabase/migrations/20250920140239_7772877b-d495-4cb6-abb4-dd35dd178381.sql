-- Add LG Lead #3 and LG Lead #4 columns to opportunities_raw table
ALTER TABLE opportunities_raw 
ADD COLUMN investment_professional_point_person_3 text,
ADD COLUMN investment_professional_point_person_4 text;

-- Update any existing LG Team column to include all 4 leads
-- This assumes lg_team should be a computed field combining all leads
UPDATE opportunities_raw 
SET lg_team = TRIM(BOTH ', ' FROM 
  CONCAT_WS(', ', 
    NULLIF(TRIM(investment_professional_point_person_1), ''),
    NULLIF(TRIM(investment_professional_point_person_2), ''),
    NULLIF(TRIM(investment_professional_point_person_3), ''),
    NULLIF(TRIM(investment_professional_point_person_4), '')
  )
)
WHERE investment_professional_point_person_1 IS NOT NULL 
   OR investment_professional_point_person_2 IS NOT NULL
   OR investment_professional_point_person_3 IS NOT NULL
   OR investment_professional_point_person_4 IS NOT NULL;