-- First, drop the existing check constraint and add a new one that includes the insurance category
ALTER TABLE phrase_library DROP CONSTRAINT IF EXISTS phrase_library_category_check;

ALTER TABLE phrase_library ADD CONSTRAINT phrase_library_category_check 
CHECK (category IN (
  'subject', 'greeting', 'opening', 'closing', 'meeting_request',
  'inquiry_opportunity', 'inquiry_article', 'inquiry_focus_area', 'inquiry_generic',
  'ps', 'top_opportunities', 'article_recommendations', 'platforms', 'addons',
  'talking_points', 'talking_points_insurance', 'org_update', 'attachments',
  'focus_area_defaults', 'self_personalization', 'ai_backup', 'team_mention', 'assistant_cc'
));

-- Now insert the Insurance Services talking points
INSERT INTO phrase_library (id, template_id, category, phrase_text, tri_state, weight, is_global, sync_behavior, created_at, updated_at)
VALUES 
  (gen_random_uuid(), NULL, 'talking_points_insurance', 'We''re interested in insurance services opportunities with defensible underwriting, predictable fee/commission revenue, and a clear path for long-term organic growth.', 'always', 1.0, true, 'inherit', now(), now()),
  (gen_random_uuid(), NULL, 'talking_points_insurance', 'Founder-owned businesses are our strong preference, though we will also consider opportunities owned by smaller sponsors.', 'always', 1.0, true, 'inherit', now(), now()),
  (gen_random_uuid(), NULL, 'talking_points_insurance', 'Our preferred equity check size in this space is $400-800 million, with flexibility to go as low as $150 million or as high as ~$1 billion for the right opportunity.', 'always', 1.0, true, 'inherit', now(), now()),
  (gen_random_uuid(), NULL, 'talking_points_insurance', 'We can consider minority investments, but only in founder- or family-owned businesses.', 'always', 1.0, true, 'inherit', now(), now()),
  (gen_random_uuid(), NULL, 'talking_points_insurance', 'We prioritize situations where we can build scale, not just buy it – so platforms with room for operational expansion, strategic add-ons, and long-term compounding.', 'always', 1.0, true, 'inherit', now(), now()),
  (gen_random_uuid(), NULL, 'talking_points_insurance', 'Niche brokerages are of particular interest, and we will also evaluate MGAs/MGUs that meet our criteria for predictability, specialization, and underwriting discipline.', 'always', 1.0, true, 'inherit', now(), now());