-- Add LG Lead #3 and LG Lead #4 columns to opportunities_raw table
ALTER TABLE opportunities_raw 
ADD COLUMN investment_professional_point_person_3 text,
ADD COLUMN investment_professional_point_person_4 text;

-- Drop the existing lg_team column since it's causing issues
ALTER TABLE opportunities_raw DROP COLUMN IF EXISTS lg_team;

-- Add lg_team back as a regular text column (not generated)
-- We'll handle the logic in the application layer
ALTER TABLE opportunities_raw 
ADD COLUMN lg_team text;