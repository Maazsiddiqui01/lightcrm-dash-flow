export interface FocusAreaDescription {
  focus_area: string;
  description: string;
  platform_type: string;
  sector: string;
}

export interface Opportunity {
  deal_name: string;
  ebitda_in_ms: number | null;
}

export interface Article {
  focus_area: string;
  article_link: string;
  last_date_to_use: string | null;
}

export interface ContactEmailComposer {
  contact_id: string;
  full_name: string;
  first_name: string;
  email: string;
  organization: string | null;
  focus_areas: string[];
  fa_count: number;
  fa_sectors: string[];
  fa_descriptions: FocusAreaDescription[];
  gb_present: boolean;
  hs_present: boolean;
  ls_present: boolean;
  has_opps: boolean;
  opps: Opportunity[];
  articles: Article[];
  lead_emails: string[];
  assistant_names: string[];
  assistant_emails: string[];
  most_recent_contact: string | null;
  latest_contact_email: string | null;
  latest_contact_meeting: string | null;
  outreach_date: string | null;
  email_cc: string | null;
  meeting_cc: string | null;
  delta_type: 'Email' | 'Meeting' | null;
}