-- Add foreign key columns to link opportunities to contacts
ALTER TABLE opportunities_raw 
ADD COLUMN deal_source_contact_1_id uuid REFERENCES contacts_raw(id) ON DELETE SET NULL,
ADD COLUMN deal_source_contact_2_id uuid REFERENCES contacts_raw(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_opportunities_source_contact_1 ON opportunities_raw(deal_source_contact_1_id);
CREATE INDEX idx_opportunities_source_contact_2 ON opportunities_raw(deal_source_contact_2_id);

-- Add comment explaining the columns
COMMENT ON COLUMN opportunities_raw.deal_source_contact_1_id IS 'Foreign key reference to contacts_raw for deal source individual #1';
COMMENT ON COLUMN opportunities_raw.deal_source_contact_2_id IS 'Foreign key reference to contacts_raw for deal source individual #2';