-- Create articles table for focus area article repository
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  focus_area TEXT NOT NULL,
  article_link TEXT NOT NULL,
  article_date TIMESTAMP WITH TIME ZONE,
  added_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add computed age_in_days as a function for better performance
CREATE OR REPLACE FUNCTION public.get_article_age_in_days(added_date TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT EXTRACT(DAY FROM (now() - added_date))::INTEGER;
$$;

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Articles are readable by everyone"
ON public.articles
FOR SELECT
USING (true);

CREATE POLICY "Articles can be inserted by everyone"
ON public.articles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Articles can be updated by everyone"
ON public.articles
FOR UPDATE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Add index for better performance on focus_area lookups
CREATE INDEX idx_articles_focus_area ON public.articles(focus_area);
CREATE INDEX idx_articles_added_date ON public.articles(added_date DESC);