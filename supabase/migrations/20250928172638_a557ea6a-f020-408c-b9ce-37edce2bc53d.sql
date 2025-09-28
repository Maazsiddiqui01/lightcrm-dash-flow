-- Insert preset email templates
INSERT INTO email_templates (
  id, name, description, is_preset, gb_present, fa_bucket, has_opps, 
  delta_type, subject_mode, hs_present, ls_present, max_opps, 
  custom_instructions, custom_insertion
) VALUES 
(
  gen_random_uuid(),
  'Relationship',
  'Casual outreach focused on maintaining relationships with existing contacts',
  true,
  true,
  2,
  true,
  'Email',
  'lg_first',
  true,
  true,
  3,
  'Keep tone warm and personal. Focus on relationship maintenance.',
  'before_closing'
),
(
  gen_random_uuid(),
  'Business Development', 
  'Formal business outreach for new opportunities and partnerships',
  true,
  true,
  3,
  true,
  'Meeting',
  'lg_first',
  true,
  true,
  5,
  'Professional tone focused on business opportunities and value propositions.',
  'before_closing'
),
(
  gen_random_uuid(),
  'Hybrid',
  'Balanced approach mixing relationship building with business development',
  true,
  true,
  3,
  true,
  'Meeting',
  'fa_first',
  true,
  true,
  4,
  'Professional but approachable. Balance relationship and business elements.',
  'before_closing'
);

-- Get the template IDs for settings
WITH template_ids AS (
  SELECT id, name FROM email_templates WHERE is_preset = true AND name IN ('Relationship', 'Business Development', 'Hybrid')
)

-- Insert template settings for Relationship
INSERT INTO email_template_settings (template_id, core_overrides, modules, sometimes_weights)
SELECT 
  id,
  '{
    "tone": "auto",
    "length": ["brief", "mid"],
    "subject_pools": "mixed"
  }'::jsonb,
  '{
    "meeting": "Sometimes",
    "top_opp": "Sometimes", 
    "article": "Sometimes",
    "org_update": "Sometimes",
    "platforms": "Never",
    "addons": "Never",
    "talking_points": "Sometimes",
    "attachments": "Never"
  }'::jsonb,
  '{
    "meeting": 50,
    "top_opp": 60,
    "article": 70,
    "org_update": 30,
    "talking_points": 50,
    "attachments": 0
  }'::jsonb
FROM template_ids WHERE name = 'Relationship'

UNION ALL

-- Insert template settings for Business Development
SELECT 
  id,
  '{
    "tone": "neutral",
    "length": "mid",
    "subject_pools": "formal"
  }'::jsonb,
  '{
    "meeting": "Always",
    "top_opp": "Always",
    "article": "Always", 
    "org_update": "Always",
    "platforms": "Always",
    "addons": "Always",
    "talking_points": "Always",
    "attachments": "Sometimes"
  }'::jsonb,
  '{
    "meeting": 100,
    "top_opp": 100,
    "article": 100,
    "org_update": 100,
    "platforms": 100,
    "addons": 100,
    "talking_points": 100,
    "attachments": 40
  }'::jsonb
FROM template_ids WHERE name = 'Business Development'

UNION ALL

-- Insert template settings for Hybrid
SELECT 
  id,
  '{
    "tone": "neutral", 
    "length": "mid",
    "subject_pools": "mixed"
  }'::jsonb,
  '{
    "meeting": "Always",
    "top_opp": "Always",
    "article": "Sometimes",
    "org_update": "Sometimes", 
    "platforms": "Never",
    "addons": "Never",
    "talking_points": "Sometimes",
    "attachments": "Never"
  }'::jsonb,
  '{
    "meeting": 100,
    "top_opp": 100,
    "article": 60,
    "org_update": 50,
    "platforms": 0,
    "addons": 0, 
    "talking_points": 40,
    "attachments": 0
  }'::jsonb
FROM template_ids WHERE name = 'Hybrid';

-- Insert phrase library seeds using the correct column names
INSERT INTO phrase_library (template_id, scope, text_value, tri_state, weight, active) VALUES
-- Global phrases (template_id = null)
(NULL, 'subject.formal', 'LG / Update on {{organization}}', 'Sometimes', 1, true),
(NULL, 'subject.formal', 'LG / {{focus_areas}} opportunities', 'Sometimes', 1, true),
(NULL, 'subject.formal', 'LG / Checking in re: {{organization}}', 'Sometimes', 1, true),
(NULL, 'subject.casual', 'Quick update', 'Sometimes', 1, true),
(NULL, 'subject.casual', 'Touching base', 'Sometimes', 1, true),
(NULL, 'subject.casual', 'Following up', 'Sometimes', 1, true),
(NULL, 'greeting', 'I hope you''re well.', 'Sometimes', 1, true),
(NULL, 'greeting', 'I hope you''re doing well.', 'Sometimes', 1, true),
(NULL, 'greeting', 'I trust you''re well.', 'Sometimes', 1, true),
(NULL, 'greeting', 'I hope all is well.', 'Sometimes', 1, true),
(NULL, 'meeting', 'Happy to find time to touch base if you''re available.', 'Sometimes', 1, true),
(NULL, 'meeting', 'Would love to catch up when your schedule permits.', 'Sometimes', 1, true),
(NULL, 'meeting', 'Let me know if you''d like to connect over coffee or a call.', 'Sometimes', 1, true),
(NULL, 'meeting', 'I''d be delighted to reconnect when convenient for you.', 'Sometimes', 1, true),
(NULL, 'fa.default', 'We continue to see interesting opportunities in {{focus_area}}.', 'Sometimes', 1, true),
(NULL, 'fa.default', 'The {{focus_area}} space remains active with several compelling situations.', 'Sometimes', 1, true),
(NULL, 'fa.default', 'We''re tracking some interesting developments in {{focus_area}}.', 'Sometimes', 1, true);