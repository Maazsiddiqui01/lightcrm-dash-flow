-- Add last_date_to_use column to articles table
ALTER TABLE articles ADD COLUMN last_date_to_use date NULL;

-- Create index for better performance when filtering by last_date_to_use
CREATE INDEX idx_articles_last_date_to_use ON articles(last_date_to_use) WHERE last_date_to_use IS NOT NULL;