-- Complete Email Builder Schema Rebuild
-- Phase 1: Drop existing tables if they exist and recreate
DROP TABLE IF EXISTS phrase_rotation_log CASCADE;
DROP TABLE IF EXISTS phrase_library CASCADE;
DROP TABLE IF EXISTS master_template_defaults CASCADE;
DROP TABLE IF EXISTS email_template_settings CASCADE;

-- Core phrase library table with tri-state support
CREATE TABLE phrase_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'subject', 'greeting', 'opening', 'closing',
    'meeting_request', 'inquiry_opportunity', 'inquiry_article',
    'inquiry_focus_area', 'inquiry_generic', 'ps',
    'top_opportunities', 'article_recommendations', 'platforms',
    'addons', 'talking_points', 'org_update', 'attachments',
    'focus_area_defaults', 'self_personalization', 'ai_backup',
    'team_mention', 'assistant_cc'
  )),
  phrase_text TEXT NOT NULL,
  tri_state TEXT NOT NULL DEFAULT 'sometimes' CHECK (tri_state IN ('always', 'sometimes', 'never')),
  weight NUMERIC DEFAULT 1.0,
  is_global BOOLEAN DEFAULT false,
  sync_behavior TEXT DEFAULT 'inherit' CHECK (sync_behavior IN ('inherit', 'override', 'append')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_phrase_library_template ON phrase_library(template_id);
CREATE INDEX idx_phrase_library_category ON phrase_library(category);
CREATE INDEX idx_phrase_library_global ON phrase_library(is_global);

-- Rotation tracking to prevent repeats
CREATE TABLE phrase_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_id UUID REFERENCES phrase_library(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts_raw(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  email_type TEXT CHECK (email_type IN ('Email', 'Meeting'))
);

CREATE INDEX idx_rotation_contact ON phrase_rotation_log(contact_id);
CREATE INDEX idx_rotation_phrase ON phrase_rotation_log(phrase_id);

-- Master template defaults (days-based logic)
CREATE TABLE master_template_defaults (
  master_key TEXT PRIMARY KEY CHECK (master_key IN ('relationship_maintenance', 'business_development', 'hybrid_neutral')),
  days_min INTEGER NOT NULL,
  days_max INTEGER,
  tone TEXT NOT NULL CHECK (tone IN ('casual', 'hybrid', 'formal')),
  length TEXT NOT NULL CHECK (length IN ('brief', 'medium', 'detailed')),
  subject_style TEXT NOT NULL CHECK (subject_style IN ('casual', 'mixed', 'formal')),
  default_modules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced template settings
CREATE TABLE email_template_settings (
  template_id UUID PRIMARY KEY REFERENCES email_templates(id) ON DELETE CASCADE,
  -- Core overrides
  tone_override TEXT CHECK (tone_override IN ('casual', 'hybrid', 'formal')),
  length_override TEXT CHECK (length_override IN ('brief', 'medium', 'detailed')),
  subject_pool_override TEXT CHECK (subject_pool_override IN ('casual', 'mixed', 'formal')),
  -- Days range configuration
  days_range_config JSONB DEFAULT '{}',
  -- Module tri-states
  module_states JSONB DEFAULT '{
    "top_opportunities": "always",
    "article_recommendations": "sometimes",
    "platforms": "sometimes",
    "addons": "sometimes",
    "suggested_talking_points": "sometimes",
    "general_org_update": "sometimes",
    "attachments": "never",
    "ps": "sometimes"
  }',
  -- Personalization configuration
  personalization_config JSONB DEFAULT '{
    "sources": {
      "user_notes": "always",
      "ai_notes": "sometimes",
      "linkedin": "always",
      "twitter": "sometimes",
      "self_personalization": "sometimes",
      "ai_backup": "sometimes"
    },
    "self_topics": []
  }',
  -- Inquiry configuration
  inquiry_config JSONB DEFAULT '{
    "priority": ["opportunity", "article", "focus_area", "generic"],
    "min_inquiries": 1,
    "max_inquiries": 2
  }',
  -- Quality rules
  quality_rules JSONB DEFAULT '{
    "skip_if_no_opps": false,
    "skip_if_no_articles": false,
    "min_personalization_score": 0,
    "ebitda_threshold": 30
  }'
);

-- Insert the three master templates with defaults
INSERT INTO master_template_defaults (master_key, days_min, days_max, tone, length, subject_style, default_modules) VALUES
('relationship_maintenance', 0, 45, 'casual', 'brief', 'casual', '{
  "top_opportunities": "always",
  "article_recommendations": "sometimes",
  "platforms": "never",
  "addons": "never",
  "suggested_talking_points": "sometimes",
  "general_org_update": "never",
  "attachments": "never",
  "ps": "sometimes"
}'),
('hybrid_neutral', 46, 90, 'hybrid', 'medium', 'mixed', '{
  "top_opportunities": "always",
  "article_recommendations": "sometimes",
  "platforms": "sometimes",
  "addons": "sometimes",
  "suggested_talking_points": "sometimes",
  "general_org_update": "sometimes",
  "attachments": "never",
  "ps": "sometimes"
}'),
('business_development', 91, NULL, 'formal', 'detailed', 'formal', '{
  "top_opportunities": "sometimes",
  "article_recommendations": "always",
  "platforms": "always",
  "addons": "always",
  "suggested_talking_points": "always",
  "general_org_update": "always",
  "attachments": "sometimes",
  "ps": "always"
}');

-- Seed global phrase libraries
-- Subject Lines - Formal
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('subject', '[LG Focus Area]', 'sometimes', true),
('subject', '[My Org] / [Their Org]', 'sometimes', true),
('subject', '[My Org] / [Their Org]: [LG Focus Area]', 'sometimes', true),
('subject', '[LG Focus Area] | [My Org]', 'sometimes', true);

-- Subject Lines - Casual
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('subject', 'Touching base', 'sometimes', true),
('subject', 'Checking in', 'sometimes', true),
('subject', 'Quick note', 'sometimes', true),
('subject', 'Reaching out', 'sometimes', true),
('subject', '(Send with no subject)', 'sometimes', true);

-- Greetings
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('greeting', 'Hi [First Name],', 'sometimes', true),
('greeting', '[First Name],', 'sometimes', true),
('greeting', 'I hope you''re well.', 'sometimes', true),
('greeting', 'I trust you''re having a good week.', 'sometimes', true);

-- Opportunity Inquiries
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('inquiry_opportunity', 'Would it be useful to compare notes on [Opp X] this month?', 'sometimes', true),
('inquiry_opportunity', 'Are you open to a quick call to discuss next steps on [Opp X]?', 'sometimes', true),
('inquiry_opportunity', 'Is there a convenient time to review where [Opp X] stands?', 'sometimes', true),
('inquiry_opportunity', 'Could we align on scope and timing for [Opp X]?', 'sometimes', true);

-- Article Inquiries
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('inquiry_article', 'Curious—does this line up with what you''re seeing?', 'sometimes', true),
('inquiry_article', 'How relevant is this to your current priorities?', 'sometimes', true),
('inquiry_article', 'Does anything here change how you''re thinking about the space?', 'sometimes', true);

-- Focus Area Inquiries
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('inquiry_focus_area', 'What themes are you most focused on in [Focus Area] right now?', 'sometimes', true),
('inquiry_focus_area', 'Where do you see the most activity across [Focus Area] this quarter?', 'sometimes', true),
('inquiry_focus_area', 'Any sub sectors in [Focus Area] we should add to our radar?', 'sometimes', true);

-- Generic Inquiries
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('inquiry_generic', 'Anything new on your end since we last spoke?', 'sometimes', true),
('inquiry_generic', 'What''s the best way to be helpful on your current priorities?', 'sometimes', true),
('inquiry_generic', 'Is there someone on your team we should connect with as a next step?', 'sometimes', true);

-- Meeting Requests
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('meeting_request', 'We''d like to schedule time to touch base.', 'sometimes', true),
('meeting_request', 'Let''s connect when you get a chance. No rush — [Assistant] can assist with scheduling.', 'sometimes', true),
('meeting_request', 'Could we schedule time to compare notes on where there might be opportunity in [Focus Area]?', 'sometimes', true),
('meeting_request', 'Happy to find time to touch base if you''re available.', 'sometimes', true);

-- Assistant CC
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('assistant_cc', '[LG Assistant Name], copied here, can coordinate logistics.', 'always', true);

-- Closings
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('closing', '-Tom', 'sometimes', true),
('closing', 'Best, Tom', 'sometimes', true),
('closing', 'Kind Regards, Tom', 'sometimes', true),
('closing', 'Regards, Tom', 'sometimes', true);

-- Top Opportunities module phrases
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('top_opportunities', 'Following up on the opportunities we discussed — [X] (and others) remain priorities for us.', 'sometimes', true),
('top_opportunities', 'I wanted to circle back — [X] and related opportunities are still active.', 'sometimes', true),
('top_opportunities', 'Quick update: opportunities we spoke about, including [X], are progressing.', 'sometimes', true);

-- Article Recommendations module phrases
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('article_recommendations', 'I saw this article the other day and thought you''d find it interesting: [Link].', 'sometimes', true),
('article_recommendations', 'This piece caught my eye and seemed relevant: [Link].', 'sometimes', true),
('article_recommendations', 'Came across this and immediately thought of you: [Link].', 'sometimes', true);

-- Platforms module phrases
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('platforms', 'We continue to focus on identifying and evaluating new platform opportunities in [Focus Area], especially > $[EBITDA]m and [sub sector emphasis].', 'sometimes', true),
('platforms', 'We''re looking at a new [Focus Area] platform, with emphasis on > $[EBITDA]m.', 'sometimes', true),
('platforms', 'We''re evaluating new platforms with scale potential.', 'sometimes', true);

-- Add-ons module phrases
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('addons', 'We''re also looking for add ons around our existing platforms in this space — [Platform A] and [Platform B].', 'sometimes', true),
('addons', 'We continue to evaluate complementary add ons in this area.', 'sometimes', true);

-- Talking Points module phrases
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('talking_points', '[Sector] is seeing significant momentum, particularly in [X].', 'sometimes', true),
('talking_points', 'Key trends in [Focus Area] include [Y].', 'sometimes', true);

-- Org Update module phrases
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('org_update', 'We are wrapping up fundraising for [Fund Name] and have already started deploying capital.', 'sometimes', true),
('org_update', 'Our first investment was in [Company]; our experience with [prior company/sector] helped differentiate us.', 'sometimes', true),
('org_update', 'In addition to [Focus Area], we are actively focused on [Sector A], [Sector B], and [Sector C].', 'sometimes', true);

-- Self Personalization phrases
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('self_personalization', 'Following [Team] this season.', 'sometimes', true),
('self_personalization', 'I''ve been reading [Title].', 'sometimes', true),
('self_personalization', 'Hope you are enjoying the end of summer.', 'sometimes', true),
('self_personalization', 'All good here.', 'sometimes', true);

-- AI Backup Personalization
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('ai_backup', 'I wanted to share a quick update on my end.', 'sometimes', true),
('ai_backup', 'I''ve been reviewing recent trends in the space.', 'sometimes', true),
('ai_backup', 'There''s been interesting movement across the sector.', 'sometimes', true);

-- P.S. phrases
INSERT INTO phrase_library (category, phrase_text, tri_state, is_global) VALUES
('ps', 'P.S. Saw the announcement on the sale of [Company] to [Buyer] — curious to get your thoughts.', 'sometimes', true),
('ps', 'P.S. Congrats on [news] — well deserved.', 'sometimes', true),
('ps', 'P.S. Noticed [milestone/post] — nice work.', 'sometimes', true);

-- Enable RLS
ALTER TABLE phrase_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrase_rotation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_template_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "phrase_library_read" ON phrase_library FOR SELECT USING (true);
CREATE POLICY "phrase_library_write" ON phrase_library FOR INSERT WITH CHECK (true);
CREATE POLICY "phrase_library_update" ON phrase_library FOR UPDATE USING (true);
CREATE POLICY "phrase_library_delete" ON phrase_library FOR DELETE USING (true);

CREATE POLICY "rotation_read" ON phrase_rotation_log FOR SELECT USING (true);
CREATE POLICY "rotation_write" ON phrase_rotation_log FOR INSERT WITH CHECK (true);

CREATE POLICY "master_templates_read" ON master_template_defaults FOR SELECT USING (true);
CREATE POLICY "settings_read" ON email_template_settings FOR SELECT USING (true);
CREATE POLICY "settings_write" ON email_template_settings FOR ALL USING (true);