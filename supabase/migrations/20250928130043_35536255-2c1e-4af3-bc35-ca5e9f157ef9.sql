-- Add X/Twitter column to contacts_raw table
ALTER TABLE public.contacts_raw 
ADD COLUMN x_twitter_url text;