-- Add Russ Triedman to lg_leads_directory
INSERT INTO lg_leads_directory (lead_name, email, last_name)
VALUES ('Russ Triedman', 'triedman@lindsaygoldbergllc.com', 'Triedman')
ON CONFLICT (lead_name) DO NOTHING;