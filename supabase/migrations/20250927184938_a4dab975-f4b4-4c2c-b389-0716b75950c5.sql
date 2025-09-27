-- Add LinkedIn column to contacts_raw table
ALTER TABLE public.contacts_raw 
ADD COLUMN linkedin_url text;