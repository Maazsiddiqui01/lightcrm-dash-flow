export type TriState = 'always' | 'sometimes' | 'never';
export type SyncBehavior = 'inherit' | 'override' | 'append';

export type PhraseCategory = 
  | 'subject'
  | 'greeting'
  | 'opening'
  | 'closing'
  | 'meeting_request'
  | 'inquiry_opportunity'
  | 'inquiry_article'
  | 'inquiry_focus_area'
  | 'inquiry_generic'
  | 'ps'
  | 'top_opportunities'
  | 'article_recommendations'
  | 'platforms'
  | 'addons'
  | 'talking_points'
  | 'org_update'
  | 'attachments'
  | 'focus_area_defaults'
  | 'self_personalization'
  | 'ai_backup'
  | 'team_mention'
  | 'assistant_cc';

export interface PhraseLibraryItem {
  id: string;
  template_id: string | null;
  category: PhraseCategory;
  phrase_text: string;
  tri_state: TriState;
  weight: number;
  is_global: boolean;
  sync_behavior: SyncBehavior;
  created_at: string;
  updated_at: string;
}

export interface PhraseRotationLog {
  id: string;
  phrase_id: string;
  contact_id: string;
  used_at: string;
  email_type: 'Email' | 'Meeting';
}

export interface MasterTemplateDefaults {
  id: string;
  master_key: 'relationship_maintenance' | 'business_development' | 'hybrid_neutral';
  days_min: number;
  days_max: number | null;
  tone: 'casual' | 'hybrid' | 'formal';
  length: 'brief' | 'medium' | 'detailed';
  subject_style: 'casual' | 'mixed' | 'formal';
  default_modules: Record<string, TriState>;
  created_at: string;
}

export interface TemplateSettings {
  template_id: string;
  tone_override: string | null;
  length_override: string | null;
  subject_pool_override: string | null;
  days_range_config: Record<string, any>;
  module_states: Record<string, TriState>;
  personalization_config: {
    sources: {
      user_notes: TriState;
      ai_notes: TriState;
      linkedin: TriState;
      twitter: TriState;
      self_personalization: TriState;
      ai_backup: TriState;
    };
    self_topics: string[];
  };
  inquiry_config: {
    priority: ('opportunity' | 'article' | 'focus_area' | 'generic')[];
    min_inquiries: number;
    max_inquiries: number;
  };
  quality_rules: {
    skip_if_no_opps: boolean;
    skip_if_no_articles: boolean;
    min_personalization_score: number;
    ebitda_threshold: number;
  };
}

export const PHRASE_CATEGORIES: Record<PhraseCategory, string> = {
  subject: 'Subject Lines',
  greeting: 'Greetings',
  opening: 'Opening Lines',
  closing: 'Closing Lines',
  meeting_request: 'Meeting Requests',
  inquiry_opportunity: 'Inquiry: Opportunity',
  inquiry_article: 'Inquiry: Article',
  inquiry_focus_area: 'Inquiry: Focus Area',
  inquiry_generic: 'Inquiry: Generic',
  ps: 'P.S. Lines',
  top_opportunities: 'Top Opportunities',
  article_recommendations: 'Article Recommendations',
  platforms: 'Platforms',
  addons: 'Add-on Opportunities',
  talking_points: 'Suggested Talking Points',
  org_update: 'General Org Update',
  attachments: 'Attachments',
  focus_area_defaults: 'Focus Area Defaults',
  self_personalization: 'Self Personalization',
  ai_backup: 'AI Backup Personalization',
  team_mention: 'Team Mention',
  assistant_cc: 'Assistant CC'
};

export const MODULE_LABELS: Record<string, string> = {
  top_opportunities: 'Top Opportunities',
  article_recommendations: 'Article Recommendations',
  platforms: 'Platforms',
  addons: 'Add-on Opportunities',
  suggested_talking_points: 'Suggested Talking Points',
  general_org_update: 'General Org Update',
  attachments: 'Attachments',
  ps: 'P.S.'
};