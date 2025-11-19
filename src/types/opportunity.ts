// Opportunity type definitions

export interface OpportunityBase {
  id: string;
  deal_name: string | null;
  lg_focus_area: string | null;
  sector: string | null;
  platform_add_on: string | null;
  tier: string | null;
  status: string | null;
  url: string | null;
  summary_of_opportunity: string | null;
  next_steps: string | null;
  most_recent_notes: string | null;
  ebitda_in_ms: number | null;
  ebitda_notes: string | null;
  ownership: string | null;
  ownership_type: string | null;
  investment_professional_point_person_1: string | null;
  investment_professional_point_person_2: string | null;
  investment_professional_point_person_3: string | null;
  investment_professional_point_person_4: string | null;
  lg_team: string | null;
  acquisition_date: string | null;
  deal_source_company: string | null;
  deal_source_individual_1: string | null;
  deal_source_individual_2: string | null;
  date_of_origination: string | null;
  process_timeline: string | null;
  dealcloud: boolean | null;
  priority: boolean | null;
  headquarters: string | null;
  revenue: number | null;
  est_deal_size: number | null;
  est_lg_equity_invest: number | null;
  last_modified: string | null;
  created_at: string | null;
  updated_at: string | null;
  funds: string | null;
  assigned_to: string | null;
  created_by: string | null;
}

export interface OpportunityFilters {
  focusArea: string[];
  ownershipType: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  tier: string[];
  status: string[];
  sector: string[];
  leads: string[];
  platformAddOn: string[];
  referralContacts: string[];
  referralCompanies: string[];
  dateOfOrigination: string[];
  headquarters: string[];
  processTimeline: string[];
  funds: string[];
  dealcloud: string[];
  priority: string[];
  acquisitionDateStart?: Date;
  acquisitionDateEnd?: Date;
  searchTerm?: string;
}

export interface OpportunityStats {
  totalOpportunities: number;
  tier1ActiveDeals: number;
  familyFounderPercentage: string;
  averageEbitda: string;
  loading: boolean;
}
