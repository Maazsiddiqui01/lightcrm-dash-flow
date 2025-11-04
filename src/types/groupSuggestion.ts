/**
 * Types for persistent group suggestions
 */

export type SuggestionMode = 'org_sector' | 'interaction';
export type SuggestionStatus = 'pending' | 'approved' | 'dismissed';

export interface GroupMember {
  contact_id: string;
  full_name: string;
  email_address: string;
  organization?: string | null;
  sector?: string | null;
  title?: string | null;
  focus_areas?: string[];
}

export interface GroupSuggestionMetadata {
  organization?: string;
  sector?: string;
  focusArea?: string;
  interactionCount?: number;
  confidence?: number;
  [key: string]: any;
}

export interface GroupSuggestion {
  id: string;
  suggestion_id: string;
  user_id: string;
  mode: SuggestionMode;
  suggested_name: string;
  members: GroupMember[];
  metadata: GroupSuggestionMetadata;
  status: SuggestionStatus;
  group_id?: string | null;
  created_at: string;
  updated_at: string;
  dismissed_at?: string | null;
  approved_at?: string | null;
}

export interface SaveGroupSuggestionInput {
  suggestion_id: string;
  mode: SuggestionMode;
  suggested_name: string;
  members: GroupMember[];
  metadata?: GroupSuggestionMetadata;
  status?: SuggestionStatus;
}

export interface UpdateSuggestionStatusInput {
  suggestionId: string;
  status: SuggestionStatus;
  groupId?: string;
}
