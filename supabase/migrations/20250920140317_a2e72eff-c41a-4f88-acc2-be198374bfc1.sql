-- Add LG Lead #3 and LG Lead #4 columns to opportunities_raw table
ALTER TABLE opportunities_raw 
ADD COLUMN investment_professional_point_person_3 text,
ADD COLUMN investment_professional_point_person_4 text;

-- If lg_team is a generated column, we need to drop and recreate it to include the new fields
-- First check if it's a generated column and drop it
ALTER TABLE opportunities_raw DROP COLUMN IF EXISTS lg_team;

-- Add back lg_team as a generated column that includes all 4 leads
ALTER TABLE opportunities_raw 
ADD COLUMN lg_team text GENERATED ALWAYS AS (
  TRIM(BOTH ', ' FROM 
    CONCAT_WS(', ', 
      NULLIF(TRIM(investment_professional_point_person_1), ''),
      NULLIF(TRIM(investment_professional_point_person_2), ''),
      NULLIF(TRIM(investment_professional_point_person_3), ''),
      NULLIF(TRIM(investment_professional_point_person_4), '')
    )
  )
) STORED;