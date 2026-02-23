
-- 1. Stephanie Davies: Delete bouncing sdavies@texascapital.com
DELETE FROM contact_email_addresses WHERE id = '07633145-0b83-410c-9d3a-f9eb43fce3df';

-- Set stephanie.davies@texascapital.com as primary
UPDATE contact_email_addresses SET is_primary = true WHERE id = '21588707-d080-4d09-ad44-91c248690c13';

-- Update contacts_raw to reflect
UPDATE contacts_raw SET email_address = 'stephanie.davies@texascapital.com' WHERE id = 'a98801a5-b1b7-46df-a64d-ebe38e8b137a';

-- 2. Kelechi Wami: Fix double @@ in contacts_raw
UPDATE contacts_raw SET email_address = 'kelechi@oberonsecurities.com' WHERE id = 'e82de514-8843-400a-965a-d18d81bd8a38';

-- Add corrected email as primary in contact_email_addresses
UPDATE contact_email_addresses SET is_primary = false WHERE contact_id = 'e82de514-8843-400a-965a-d18d81bd8a38' AND is_primary = true;

INSERT INTO contact_email_addresses (contact_id, email_address, email_type, is_primary, source)
VALUES ('e82de514-8843-400a-965a-d18d81bd8a38', 'kelechi@oberonsecurities.com', 'work', true, 'manual');
