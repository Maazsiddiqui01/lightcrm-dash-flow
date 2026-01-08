-- Update Process Status: Replace "Completed" with "No Process"
UPDATE lookup_horizon_process_status 
SET value = 'No Process', label = 'No Process' 
WHERE value = 'Completed';