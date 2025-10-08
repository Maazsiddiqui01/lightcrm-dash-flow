export interface ModuleSelection {
  // For single-select modules (Initial Greeting, Article Recommendation)
  greetingId?: string;
  articleId?: string;
  articleUrl?: string;
  articleTitle?: string;
  articleFocusArea?: string;
  
  // For multi-select modules (Suggested Talking Points, Add-ons)
  phraseIds?: string[];
  
  // For inquiry modules
  inquiryId?: string;
  
  // For subject line pool (multi-select subject IDs + style)
  subjectIds?: string[];
  style?: 'formal' | 'hybrid' | 'casual';
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
