-- Add composite index for Active Tier 1 opportunities query
-- Accelerates filtering + sorting for email builder

-- Partial index (focused on Active Tier 1 only, smaller size, better performance)
CREATE INDEX IF NOT EXISTS idx_opps_active_t1_updated 
ON opportunities_raw (updated_at DESC NULLS LAST, deal_name)
WHERE status = 'Active' AND tier = '1';

-- Add index for contact name lookups in opportunities
CREATE INDEX IF NOT EXISTS idx_opps_source_individuals
ON opportunities_raw (deal_source_individual_1, deal_source_individual_2)
WHERE status = 'Active' AND tier = '1';

-- Add comment for documentation
COMMENT ON INDEX idx_opps_active_t1_updated IS 
'Email builder: active tier 1 opportunities sorting by updated_at DESC, deal_name ASC';

COMMENT ON INDEX idx_opps_source_individuals IS 
'Email builder: active tier 1 opportunities lookup by contact name';