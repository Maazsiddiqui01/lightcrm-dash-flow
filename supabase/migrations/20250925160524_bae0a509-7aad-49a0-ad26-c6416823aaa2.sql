-- Enable Row Level Security on focus_area_description table
ALTER TABLE public.focus_area_description ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to focus area descriptions
CREATE POLICY "Focus area descriptions are readable by everyone" 
ON public.focus_area_description 
FOR SELECT 
USING (true);