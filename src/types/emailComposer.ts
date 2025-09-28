export interface FocusAreaDescription {
  focus_area: string;
  platform_type: string;
  sector: string;
  description: string;
}

export interface OpportunityData {
  deal_name: string;
  ebitda_in_ms: number | null;
}

export interface ArticleData {
  focus_area: string;
  article_link: string;
  last_date_to_use: string | null;
}

export interface ContactEmailComposer {
  contact_id: string;
  full_name: string;
  first_name: string;
  email: string;
  organization: string;
  lg_emails_cc: string;
  focus_areas: string[];
  fa_count: number;
  fa_sectors: string[];
  fa_descriptions: FocusAreaDescription[];
  gb_present: boolean;
  hs_present: boolean;
  ls_present: boolean;
  has_opps: boolean;
  opps: OpportunityData[];
  articles: ArticleData[];
  lead_emails: string[];
  assistant_names: string[];
  assistant_emails: string[];
  most_recent_contact: string | null;
  outreach_date: string | null;
}