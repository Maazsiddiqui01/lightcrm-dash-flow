-- Add acquisition_date column to opportunities_raw table
ALTER TABLE public.opportunities_raw 
ADD COLUMN acquisition_date DATE;