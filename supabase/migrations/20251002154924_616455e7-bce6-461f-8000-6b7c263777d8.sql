-- Add group_email_role column to contacts_raw table
ALTER TABLE contacts_raw 
ADD COLUMN IF NOT EXISTS group_email_role text 
CHECK (group_email_role IN ('to', 'cc', 'bcc') OR group_email_role IS NULL);

COMMENT ON COLUMN contacts_raw.group_email_role IS 
'Email recipient role for group contacts: to, cc, or bcc';