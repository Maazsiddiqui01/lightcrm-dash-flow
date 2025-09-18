-- Add new columns to opportunities_raw table
ALTER TABLE public.opportunities_raw 
ADD COLUMN revenue numeric,
ADD COLUMN est_deal_size numeric,
ADD COLUMN est_lg_equity_invest numeric,
ADD COLUMN last_modified timestamp with time zone DEFAULT now();

-- Create trigger to automatically update last_modified when any column changes
CREATE OR REPLACE FUNCTION public.update_last_modified()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_modified = now();
  RETURN NEW;
END;
$$;

-- Create trigger on opportunities_raw table
CREATE TRIGGER update_opportunities_last_modified
  BEFORE UPDATE ON public.opportunities_raw
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_modified();