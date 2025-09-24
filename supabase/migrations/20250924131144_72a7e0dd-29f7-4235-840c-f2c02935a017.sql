-- Add funds column to opportunities_raw table
ALTER TABLE public.opportunities_raw 
ADD COLUMN funds text;

-- Populate the funds column based on ownership_type logic
-- If ownership_type = 'Sponsor owned' then 'LG Horizons', otherwise 'LG Fund VI'
UPDATE public.opportunities_raw 
SET funds = CASE 
  WHEN ownership_type = 'Sponsor owned' THEN 'LG Horizons'
  ELSE 'LG Fund VI'
END;