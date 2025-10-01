-- Fix the contacts_with_opportunities_v view to properly show all contacts
DROP VIEW IF EXISTS contacts_with_opportunities_v;

CREATE VIEW contacts_with_opportunities_v AS
SELECT 
  c.id,
  c.full_name,
  c.email_address,
  COALESCE(string_agg(DISTINCT o.deal_name, ', ' ORDER BY o.deal_name), '') as opportunities
FROM contacts_raw c
LEFT JOIN opportunities_app o ON (
  c.full_name = o.deal_source_individual_1 
  OR c.full_name = o.deal_source_individual_2
)
GROUP BY c.id, c.full_name, c.email_address;