-- Add delete policy for articles table to allow users to delete articles
CREATE POLICY "Articles can be deleted by everyone" 
ON public.articles 
FOR DELETE 
USING (true);