-- Add id column to master_template_defaults table
ALTER TABLE master_template_defaults 
  ADD COLUMN id UUID DEFAULT gen_random_uuid() UNIQUE;

-- Populate id for existing rows
UPDATE master_template_defaults 
SET id = gen_random_uuid() 
WHERE id IS NULL;

-- Make id NOT NULL after population
ALTER TABLE master_template_defaults 
ALTER COLUMN id SET NOT NULL;

-- Drop old PRIMARY KEY constraint on master_key
ALTER TABLE master_template_defaults 
DROP CONSTRAINT IF EXISTS master_template_defaults_pkey;

-- Add new PRIMARY KEY on id
ALTER TABLE master_template_defaults 
ADD PRIMARY KEY (id);

-- Add unique constraint on master_key
ALTER TABLE master_template_defaults 
ADD CONSTRAINT master_key_unique UNIQUE (master_key);