-- Add group_contact column to contacts_raw table
ALTER TABLE contacts_raw ADD COLUMN group_contact text NULL;

-- Create index for better performance when filtering by group
CREATE INDEX idx_contacts_raw_group_contact ON contacts_raw(group_contact) WHERE group_contact IS NOT NULL;