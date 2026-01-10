-- Add notes and next_steps columns to lg_horizons_companies
ALTER TABLE lg_horizons_companies 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS next_steps text;

-- Add notes and next_steps columns to lg_horizons_gps
ALTER TABLE lg_horizons_gps 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS next_steps text;