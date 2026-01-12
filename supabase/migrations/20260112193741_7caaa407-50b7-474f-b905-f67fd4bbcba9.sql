-- Delete the duplicate "No Known Process" entry (sort_order 5)
DELETE FROM lookup_horizon_process_status 
WHERE value = 'No Known Process' AND sort_order = 5;

-- Update "No Process" to "No Known Process"
UPDATE lookup_horizon_process_status 
SET value = 'No Known Process', label = 'No Known Process'
WHERE value = 'No Process';