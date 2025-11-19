-- Add priority column to opportunities_raw
ALTER TABLE opportunities_raw 
ADD COLUMN priority boolean DEFAULT false;

-- Add priority column to contacts_raw
ALTER TABLE contacts_raw 
ADD COLUMN priority boolean DEFAULT false;

-- Add column configuration for opportunities
INSERT INTO column_configurations (
  table_name, 
  column_name, 
  display_name, 
  field_type, 
  is_editable, 
  is_required, 
  validation_rules
)
VALUES (
  'opportunities_raw',
  'priority',
  'Priority',
  'boolean',
  true,
  false,
  '[]'::jsonb
);

-- Add column configuration for contacts
INSERT INTO column_configurations (
  table_name, 
  column_name, 
  display_name, 
  field_type, 
  is_editable, 
  is_required, 
  validation_rules
)
VALUES (
  'contacts_raw',
  'priority',
  'Priority',
  'boolean',
  true,
  false,
  '[]'::jsonb
);