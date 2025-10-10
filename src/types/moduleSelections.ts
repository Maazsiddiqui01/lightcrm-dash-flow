export interface ModuleSelection {
  // Selection type
  type?: 'phrase' | 'article';
  
  // Category tracking
  category?: string;
  
  // For single-select phrase modules
  phraseId?: string;
  phraseText?: string;
  
  // Default tracking (for preselection on next load)
  defaultPhraseId?: string;   // The "starred" default phrase
  isDefault?: boolean;        // Quick check if current === default
  
  // For multi-select phrase modules (Suggested Talking Points, Add-ons, Platforms)
  phraseIds?: string[];
  
  // For article recommendation module
  articleId?: string;
  articleUrl?: string;
  articleTitle?: string;
  articleFocusArea?: string;
  
  // For inquiry modules
  inquiryId?: string;
  
  // For subject line pool (multi-select subject IDs + style)
  subjectIds?: string[];
  defaultSubjectId?: string;  // Primary subject within the pool
  style?: 'formal' | 'hybrid' | 'casual';
  
  // Legacy single-select greeting ID (for backward compatibility)
  greetingId?: string;
  
  // Variable interpolation data
  variables?: Record<string, any>;
}

export interface ModuleSelections {
  subject_line_pool?: ModuleSelection;
  initial_greeting?: ModuleSelection;
  self_personalization?: ModuleSelection;
  top_opportunities?: ModuleSelection;
  article_recommendations?: ModuleSelection;
  platforms?: ModuleSelection;
  addons?: ModuleSelection;
  suggested_talking_points?: ModuleSelection;
  general_org_update?: ModuleSelection;
  attachments?: ModuleSelection;
  meeting_request?: ModuleSelection;
  ai_backup_personalization?: ModuleSelection;
}
