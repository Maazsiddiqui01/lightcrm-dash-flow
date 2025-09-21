-- Update the canonical_focus_area function to return the new name format
CREATE OR REPLACE FUNCTION public.canonical_focus_area(input_text text)
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
      ELSIF normalized LIKE '%non-clinical%' THEN RETURN 'HC: Services (Non-Clinical)';  -- Updated this line
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