-- Phase 2 Fix #5: Full-Text Search Index on phrase_library

-- Create GIN index for full-text search on phrase_text
CREATE INDEX IF NOT EXISTS idx_phrase_library_fts 
ON public.phrase_library 
USING GIN (to_tsvector('english', phrase_text));

-- Create index on category for faster category filtering
CREATE INDEX IF NOT EXISTS idx_phrase_library_category
ON public.phrase_library (category);

-- Create compound index for category + text search (frequently used together)
CREATE INDEX IF NOT EXISTS idx_phrase_library_category_text
ON public.phrase_library (category, phrase_text);

-- Add helpful comment
COMMENT ON INDEX idx_phrase_library_fts IS 'Full-text search index for phrase_text using PostgreSQL tsvector';
COMMENT ON INDEX idx_phrase_library_category IS 'Category filter index for fast phrase lookup by category';
COMMENT ON INDEX idx_phrase_library_category_text IS 'Compound index for category + text filtering';