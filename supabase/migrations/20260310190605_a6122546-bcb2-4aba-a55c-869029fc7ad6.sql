
-- MERGE 1: Andrew Stevens (keep c3306bdb, delete 0461b840)
UPDATE contact_group_memberships SET contact_id = 'c3306bdb-bbb8-4237-9ac4-069a41e7b9c6'
WHERE contact_id = '0461b840-6960-4596-8128-1a856f6972a7'
  AND group_id NOT IN (SELECT group_id FROM contact_group_memberships WHERE contact_id = 'c3306bdb-bbb8-4237-9ac4-069a41e7b9c6');
DELETE FROM contact_group_memberships WHERE contact_id = '0461b840-6960-4596-8128-1a856f6972a7';
UPDATE contact_note_events SET contact_id = 'c3306bdb-bbb8-4237-9ac4-069a41e7b9c6' WHERE contact_id = '0461b840-6960-4596-8128-1a856f6972a7';
UPDATE contact_email_addresses SET contact_id = 'c3306bdb-bbb8-4237-9ac4-069a41e7b9c6'
WHERE contact_id = '0461b840-6960-4596-8128-1a856f6972a7'
  AND lower(email_address) NOT IN (SELECT lower(email_address) FROM contact_email_addresses WHERE contact_id = 'c3306bdb-bbb8-4237-9ac4-069a41e7b9c6');
DELETE FROM contact_email_addresses WHERE contact_id = '0461b840-6960-4596-8128-1a856f6972a7';
DELETE FROM contact_email_builder_settings WHERE contact_id = '0461b840-6960-4596-8128-1a856f6972a7';
DELETE FROM contact_phrase_preferences WHERE contact_id = '0461b840-6960-4596-8128-1a856f6972a7';
DELETE FROM contact_module_defaults WHERE contact_id = '0461b840-6960-4596-8128-1a856f6972a7';
INSERT INTO duplicate_merge_log (entity_type, primary_record_id, merged_record_ids, merge_reason)
VALUES ('contacts', 'c3306bdb-bbb8-4237-9ac4-069a41e7b9c6', ARRAY['0461b840-6960-4596-8128-1a856f6972a7']::uuid[], 'Duplicate Andrew Stevens');
DELETE FROM contacts_raw WHERE id = '0461b840-6960-4596-8128-1a856f6972a7';
UPDATE contacts_raw SET email_address = 'astevens@pppllc.com', organization = 'Portage Point Partners',
  title = 'Vice President', of_emails = GREATEST(COALESCE(of_emails,0), 8), updated_at = now()
WHERE id = 'c3306bdb-bbb8-4237-9ac4-069a41e7b9c6';

-- MERGE 2: Paul Hepper (keep 13c43e83, delete baade9c5)
UPDATE contact_group_memberships SET contact_id = '13c43e83-167b-4bcb-a009-ff5d8a87efa4'
WHERE contact_id = 'baade9c5-656e-414f-972b-13cd671a37ba'
  AND group_id NOT IN (SELECT group_id FROM contact_group_memberships WHERE contact_id = '13c43e83-167b-4bcb-a009-ff5d8a87efa4');
DELETE FROM contact_group_memberships WHERE contact_id = 'baade9c5-656e-414f-972b-13cd671a37ba';
UPDATE contact_note_events SET contact_id = '13c43e83-167b-4bcb-a009-ff5d8a87efa4' WHERE contact_id = 'baade9c5-656e-414f-972b-13cd671a37ba';
UPDATE contact_email_addresses SET contact_id = '13c43e83-167b-4bcb-a009-ff5d8a87efa4'
WHERE contact_id = 'baade9c5-656e-414f-972b-13cd671a37ba'
  AND lower(email_address) NOT IN (SELECT lower(email_address) FROM contact_email_addresses WHERE contact_id = '13c43e83-167b-4bcb-a009-ff5d8a87efa4');
DELETE FROM contact_email_addresses WHERE contact_id = 'baade9c5-656e-414f-972b-13cd671a37ba';
DELETE FROM contact_email_builder_settings WHERE contact_id = 'baade9c5-656e-414f-972b-13cd671a37ba';
DELETE FROM contact_phrase_preferences WHERE contact_id = 'baade9c5-656e-414f-972b-13cd671a37ba';
DELETE FROM contact_module_defaults WHERE contact_id = 'baade9c5-656e-414f-972b-13cd671a37ba';
INSERT INTO duplicate_merge_log (entity_type, primary_record_id, merged_record_ids, merge_reason)
VALUES ('contacts', '13c43e83-167b-4bcb-a009-ff5d8a87efa4', ARRAY['baade9c5-656e-414f-972b-13cd671a37ba']::uuid[], 'Duplicate Paul Hepper');
DELETE FROM contacts_raw WHERE id = 'baade9c5-656e-414f-972b-13cd671a37ba';
UPDATE contacts_raw SET email_address = 'paul.hepper@guggenheimpartners.com', full_name = 'Paul Hepper',
  title = 'Senior Managing Director', of_emails = GREATEST(COALESCE(of_emails,0), 9),
  of_meetings = GREATEST(COALESCE(of_meetings,0), 3), total_of_contacts = GREATEST(COALESCE(total_of_contacts,0), 12),
  updated_at = now()
WHERE id = '13c43e83-167b-4bcb-a009-ff5d8a87efa4';

-- MERGE 3: Ryan Lindquist (keep 77898f69, delete 588c32ae)
UPDATE contact_group_memberships SET contact_id = '77898f69-8c57-41da-97ef-b6234ea53aa6'
WHERE contact_id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc'
  AND group_id NOT IN (SELECT group_id FROM contact_group_memberships WHERE contact_id = '77898f69-8c57-41da-97ef-b6234ea53aa6');
DELETE FROM contact_group_memberships WHERE contact_id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc';
UPDATE contact_note_events SET contact_id = '77898f69-8c57-41da-97ef-b6234ea53aa6' WHERE contact_id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc';
UPDATE contact_email_addresses SET contact_id = '77898f69-8c57-41da-97ef-b6234ea53aa6'
WHERE contact_id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc'
  AND lower(email_address) NOT IN (SELECT lower(email_address) FROM contact_email_addresses WHERE contact_id = '77898f69-8c57-41da-97ef-b6234ea53aa6');
DELETE FROM contact_email_addresses WHERE contact_id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc';
DELETE FROM contact_email_builder_settings WHERE contact_id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc';
DELETE FROM contact_phrase_preferences WHERE contact_id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc';
DELETE FROM contact_module_defaults WHERE contact_id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc';
INSERT INTO duplicate_merge_log (entity_type, primary_record_id, merged_record_ids, merge_reason)
VALUES ('contacts', '77898f69-8c57-41da-97ef-b6234ea53aa6', ARRAY['588c32ae-e5a7-4e71-9110-9022dd8fffbc']::uuid[], 'Duplicate Ryan Lindquist');
DELETE FROM contacts_raw WHERE id = '588c32ae-e5a7-4e71-9110-9022dd8fffbc';
UPDATE contacts_raw SET email_address = 'ryan.lindquist@guggenheimsecurities.com', updated_at = now()
WHERE id = '77898f69-8c57-41da-97ef-b6234ea53aa6';
