-- Allow authenticated users to update focus area descriptions
CREATE POLICY "Authenticated users can update focus area descriptions"
ON public.focus_area_description
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);