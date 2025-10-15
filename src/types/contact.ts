/**
 * Consolidated Contact Type Definitions
 * Single source of truth for all contact-related types
 */

export interface ContactBase {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  phone: string | null;
  title: string | null;
  organization: string | null;
  areas_of_specialization: string | null;
  lg_sector: string | null;
  lg_focus_area_1: string | null;
  lg_focus_area_2: string | null;
  lg_focus_area_3: string | null;
  lg_focus_area_4: string | null;
  lg_focus_area_5: string | null;
  lg_focus_area_6: string | null;
  lg_focus_area_7: string | null;
  lg_focus_area_8: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  category: string | null;
  contact_type: string | null;
  delta_type: string | null;
  notes: string | null;
  url_to_online_bio: string | null;
  most_recent_contact: string | null;
  most_recent_group_contact: string | null;
  latest_contact_email: string | null;
  latest_contact_meeting: string | null;
  outreach_date: string | null;
  email_subject: string | null;
  meeting_title: string | null;
  total_of_contacts: number | null;
  of_emails: number | null;
  of_meetings: number | null;
  delta: number | null;
  days_since_last_email: number | null;
  days_since_last_meeting: number | null;
  no_of_lg_focus_areas: number | null;
  all_opps: number | null;
  no_of_opps_sourced: number | null;
  email_from: string | null;
  email_to: string | null;
  email_cc: string | null;
  meeting_from: string | null;
  meeting_to: string | null;
  meeting_cc: string | null;
  all_emails: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
  updated_at: string | null;
  lg_lead: string | null;
  lg_assistant: string | null;
  group_contact: string | null;
  group_email_role: string | null;
  linkedin_url: string | null;
  x_twitter_url: string | null;
  intentional_no_outreach: boolean | null;
  intentional_no_outreach_date: string | null;
  intentional_no_outreach_note: string | null;
  assigned_to: string | null;
  created_by: string | null;
  organization_id: string | null;
  locked_by: string | null;
  locked_until: string | null;
  lock_reason: string | null;
}

/**
 * Contact with opportunities (used in ContactsTable)
 */
export interface ContactWithOpportunities extends ContactBase {
  opportunities: string; // Comma-separated deal names
  mapped_sectors?: string; // Computed field for sectors mapped from focus areas
  days_over_under_max_lag?: number | null; // Computed field for days over/under max lag
}

/**
 * Opportunity filters for contact queries
 */
export interface OpportunityFilters {
  tier?: string[];
  platformAddon?: string[];
  ownershipType?: string[];
  status?: string[];
  lgLead?: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  ebitdaMin?: number;
  ebitdaMax?: number;
}

/**
 * Contact filters for queries
 */
export interface ContactFilters {
  focusAreas?: string[];
  sectors?: string[];
  areasOfSpecialization?: string[];
  organizations?: string[];
  titles?: string[];
  categories?: string[];
  deltaType?: string[];
  hasOpportunities?: string[];
  lgLead?: string[];
  groupContacts?: string[];
  mostRecentContactStart?: string;
  mostRecentContactEnd?: string;
  deltaMin?: number;
  deltaMax?: number;
  opportunityFilters?: OpportunityFilters;
  searchTerm?: string; // Full-text search term
}

/**
 * Pagination state
 */
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

/**
 * Contact query result with pagination
 */
export interface ContactQueryResult {
  contacts: ContactWithOpportunities[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  isRefreshing: boolean;
  refetch: () => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
}
