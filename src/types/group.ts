/**
 * Types for the many-to-many group relationship system
 */

export interface Group {
  id: string;
  name: string;
  max_lag_days: number | null;
  focus_area: string | null;
  sector: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  assigned_to: string | null;
}

export interface ContactGroupMembership {
  id: string;
  contact_id: string;
  group_id: string;
  email_role: 'to' | 'cc' | 'bcc' | 'exclude' | null;
  created_at: string;
}

export interface ContactWithGroups {
  contact_id: string;
  full_name: string;
  email_address: string;
  groups: Array<{
    group_id: string;
    group_name: string;
    email_role: 'to' | 'cc' | 'bcc' | 'exclude' | null;
    max_lag_days: number | null;
    focus_area: string | null;
    sector: string | null;
  }>;
}

export interface GroupMemberInfo {
  contact_id: string;
  full_name: string;
  email_address: string;
  email_role: 'to' | 'cc' | 'bcc' | 'exclude' | null;
  organization: string | null;
  title: string | null;
  most_recent_contact: string | null;
}
