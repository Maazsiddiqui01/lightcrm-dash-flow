-- Add "Pulled / On Hold" to lookup_horizon_process_status if it doesn't exist
INSERT INTO public.lookup_horizon_process_status (value, label, sort_order)
SELECT 'Pulled / On Hold', 'Pulled / On Hold', 5
WHERE NOT EXISTS (
  SELECT 1 FROM public.lookup_horizon_process_status 
  WHERE value = 'Pulled / On Hold'
);