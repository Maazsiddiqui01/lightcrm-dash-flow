-- Add headquarters column to opportunities_raw table
ALTER TABLE public.opportunities_raw 
ADD COLUMN headquarters text;