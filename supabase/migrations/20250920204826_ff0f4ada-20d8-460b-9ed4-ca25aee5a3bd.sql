-- Create function to normalize focus area names for canonical matching
CREATE OR REPLACE FUNCTION normalize_focus_area(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL OR trim(input_text) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Normalize the text: lowercase, trim, remove extra spaces, handle common variations
  RETURN trim(regexp_replace(
    lower(trim(input_text)),
    '\s+', ' ', 'g'
  ));
END;
$$;

-- Create function to get canonical focus area name (handles common variations)
CREATE OR REPLACE FUNCTION canonical_focus_area(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := normalize_focus_area(input_text);
  
  IF normalized IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Handle common variations and merge similar focus areas
  CASE 
    WHEN normalized LIKE '%capital goods%' OR normalized LIKE '%equipment%' THEN
      RETURN 'Capital Goods / Equipment';
    WHEN normalized LIKE '%food%' AND normalized LIKE '%agriculture%' THEN
      RETURN 'Food & Agriculture';
    WHEN normalized LIKE '%food%' AND (normalized LIKE '%beverage%' OR normalized LIKE '%service%') THEN
      RETURN 'Food & Beverage Services';
    WHEN normalized LIKE '%hc:%' OR normalized LIKE '%healthcare%' OR normalized LIKE '%health%' THEN
      -- Keep healthcare subcategories as-is but normalize the format
      IF normalized LIKE '%behavioral%' THEN RETURN 'HC: Behavioral Health';
      ELSIF normalized LIKE '%clinical solutions%' THEN RETURN 'HC: Clinical Solutions';
      ELSIF normalized LIKE '%digital health%' THEN RETURN 'HC: Digital Health';
      ELSIF normalized LIKE '%healthcare it%' THEN RETURN 'HC: Healthcare IT';
      ELSIF normalized LIKE '%life sciences%' THEN RETURN 'HC: Life Sciences';
      ELSIF normalized LIKE '%medical devices%' THEN RETURN 'HC: Medical Devices';
      ELSIF normalized LIKE '%non-clinical%' THEN RETURN 'HC: Non-Clinical Services';
      ELSIF normalized LIKE '%payor%' OR normalized LIKE '%employer%' THEN RETURN 'HC: Payor & Employer Services';
      ELSIF normalized LIKE '%population health%' THEN RETURN 'HC: Population Health';
      ELSIF normalized LIKE '%revenue cycle%' THEN RETURN 'HC: Revenue Cycle Management';
      ELSE RETURN initcap(normalized);
      END IF;
    WHEN normalized LIKE '%software%' OR normalized LIKE '%technology%' THEN
      RETURN 'Software & Technology';
    WHEN normalized LIKE '%media%' OR normalized LIKE '%marketing%' THEN
      RETURN 'Media & Marketing';
    WHEN normalized LIKE '%retail%' OR normalized LIKE '%consumer%' THEN
      RETURN 'Retail & Consumer';
    WHEN normalized LIKE '%transportation%' OR normalized LIKE '%logistics%' THEN
      RETURN 'Transportation & Logistics';
    WHEN normalized LIKE '%waste%' OR normalized LIKE '%environmental%' THEN
      RETURN 'Waste & Environmental Services';
    ELSE
      -- Default: title case the normalized text
      RETURN initcap(normalized);
  END CASE;
END;
$$;

-- Create view that provides all distinct canonical focus areas from contacts_raw
CREATE OR REPLACE VIEW ui_distinct_focus_areas_v AS
WITH all_focus_areas AS (
  -- Get focus areas from individual columns
  SELECT canonical_focus_area(lg_focus_area_1) as focus_area FROM contacts_raw WHERE lg_focus_area_1 IS NOT NULL AND trim(lg_focus_area_1) != ''
  UNION
  SELECT canonical_focus_area(lg_focus_area_2) as focus_area FROM contacts_raw WHERE lg_focus_area_2 IS NOT NULL AND trim(lg_focus_area_2) != ''
  UNION
  SELECT canonical_focus_area(lg_focus_area_3) as focus_area FROM contacts_raw WHERE lg_focus_area_3 IS NOT NULL AND trim(lg_focus_area_3) != ''
  UNION
  SELECT canonical_focus_area(lg_focus_area_4) as focus_area FROM contacts_raw WHERE lg_focus_area_4 IS NOT NULL AND trim(lg_focus_area_4) != ''
  UNION
  SELECT canonical_focus_area(lg_focus_area_5) as focus_area FROM contacts_raw WHERE lg_focus_area_5 IS NOT NULL AND trim(lg_focus_area_5) != ''
  UNION
  SELECT canonical_focus_area(lg_focus_area_6) as focus_area FROM contacts_raw WHERE lg_focus_area_6 IS NOT NULL AND trim(lg_focus_area_6) != ''
  UNION
  SELECT canonical_focus_area(lg_focus_area_7) as focus_area FROM contacts_raw WHERE lg_focus_area_7 IS NOT NULL AND trim(lg_focus_area_7) != ''
  UNION
  SELECT canonical_focus_area(lg_focus_area_8) as focus_area FROM contacts_raw WHERE lg_focus_area_8 IS NOT NULL AND trim(lg_focus_area_8) != ''
  UNION
  -- Also get from comprehensive list (split by comma)
  SELECT canonical_focus_area(trim(unnest(string_to_array(lg_focus_areas_comprehensive_list, ',')))) as focus_area 
  FROM contacts_raw 
  WHERE lg_focus_areas_comprehensive_list IS NOT NULL AND trim(lg_focus_areas_comprehensive_list) != ''
)
SELECT DISTINCT focus_area
FROM all_focus_areas
WHERE focus_area IS NOT NULL AND trim(focus_area) != ''
ORDER BY focus_area;