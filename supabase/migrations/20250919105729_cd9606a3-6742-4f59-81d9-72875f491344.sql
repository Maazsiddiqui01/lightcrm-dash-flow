-- Add computed columns to opportunities_raw table
ALTER TABLE opportunities_raw 
ADD COLUMN lg_team text GENERATED ALWAYS AS (
  CASE 
    WHEN investment_professional_point_person_1 IS NOT NULL AND investment_professional_point_person_2 IS NOT NULL 
    THEN investment_professional_point_person_1 || ', ' || investment_professional_point_person_2
    WHEN investment_professional_point_person_1 IS NOT NULL 
    THEN investment_professional_point_person_1
    WHEN investment_professional_point_person_2 IS NOT NULL 
    THEN investment_professional_point_person_2
    ELSE NULL
  END
) STORED;

ALTER TABLE opportunities_raw 
ADD COLUMN deal_source_contacts text GENERATED ALWAYS AS (
  CASE 
    WHEN deal_source_individual_1 IS NOT NULL AND deal_source_individual_2 IS NOT NULL 
    THEN deal_source_individual_1 || ', ' || deal_source_individual_2
    WHEN deal_source_individual_1 IS NOT NULL 
    THEN deal_source_individual_1
    WHEN deal_source_individual_2 IS NOT NULL 
    THEN deal_source_individual_2
    ELSE NULL
  END
) STORED;