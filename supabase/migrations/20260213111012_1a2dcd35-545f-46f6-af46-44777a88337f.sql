CREATE POLICY "Authenticated users can insert focus area descriptions"
ON public.focus_area_description
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);