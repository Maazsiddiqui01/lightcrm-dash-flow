-- Add city and state columns to contacts_raw table
ALTER TABLE public.contacts_raw 
ADD COLUMN city text,
ADD COLUMN state text;