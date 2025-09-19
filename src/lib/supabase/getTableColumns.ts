import { supabase } from "@/integrations/supabase/client";

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  displayName: string;
}

export const getTableColumns = (tableName: string): TableColumn[] => {
  if (tableName === 'contacts_raw') {
    return CONTACTS_RAW_COLUMNS;
  }
  if (tableName === 'opportunities_raw') {
    return OPPORTUNITIES_RAW_COLUMNS;
  }
  return [];
};

export const formatColumnName = (columnName: string): string => {
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Hardcoded column metadata for better performance
export const CONTACTS_RAW_COLUMNS: TableColumn[] = [
  { name: 'id', type: 'uuid', nullable: false, displayName: 'ID' },
  { name: 'full_name', type: 'text', nullable: true, displayName: 'Full Name' },
  { name: 'first_name', type: 'text', nullable: true, displayName: 'First Name' },
  { name: 'last_name', type: 'text', nullable: true, displayName: 'Last Name' },
  { name: 'email_address', type: 'text', nullable: true, displayName: 'Email Address' },
  { name: 'phone', type: 'text', nullable: true, displayName: 'Phone' },
  { name: 'title', type: 'text', nullable: true, displayName: 'Title' },
  { name: 'organization', type: 'text', nullable: true, displayName: 'Organization' },
  { name: 'areas_of_specialization', type: 'text', nullable: true, displayName: 'Areas Of Specialization' },
  { name: 'lg_sector', type: 'text', nullable: true, displayName: 'LG Sector' },
  { name: 'lg_focus_area_1', type: 'text', nullable: true, displayName: 'LG Focus Area 1' },
  { name: 'lg_focus_area_2', type: 'text', nullable: true, displayName: 'LG Focus Area 2' },
  { name: 'lg_focus_area_3', type: 'text', nullable: true, displayName: 'LG Focus Area 3' },
  { name: 'lg_focus_area_4', type: 'text', nullable: true, displayName: 'LG Focus Area 4' },
  { name: 'lg_focus_area_5', type: 'text', nullable: true, displayName: 'LG Focus Area 5' },
  { name: 'lg_focus_area_6', type: 'text', nullable: true, displayName: 'LG Focus Area 6' },
  { name: 'lg_focus_area_7', type: 'text', nullable: true, displayName: 'LG Focus Area 7' },
  { name: 'lg_focus_area_8', type: 'text', nullable: true, displayName: 'LG Focus Area 8' },
  { name: 'lg_focus_areas_comprehensive_list', type: 'text', nullable: true, displayName: 'LG Focus Areas Comprehensive List' },
  { name: 'category', type: 'text', nullable: true, displayName: 'Category' },
  { name: 'contact_type', type: 'text', nullable: true, displayName: 'Contact Type' },
  { name: 'delta_type', type: 'text', nullable: true, displayName: 'Delta Type' },
  { name: 'notes', type: 'text', nullable: true, displayName: 'Notes' },
  { name: 'url_to_online_bio', type: 'text', nullable: true, displayName: 'URL To Online Bio' },
  { name: 'most_recent_contact', type: 'timestamp with time zone', nullable: true, displayName: 'Most Recent Contact' },
  { name: 'latest_contact_email', type: 'timestamp with time zone', nullable: true, displayName: 'Latest Contact Email' },
  { name: 'latest_contact_meeting', type: 'timestamp with time zone', nullable: true, displayName: 'Latest Contact Meeting' },
  { name: 'outreach_date', type: 'timestamp with time zone', nullable: true, displayName: 'Outreach Date' },
  { name: 'email_subject', type: 'text', nullable: true, displayName: 'Email Subject' },
  { name: 'meeting_title', type: 'text', nullable: true, displayName: 'Meeting Title' },
  { name: 'total_of_contacts', type: 'integer', nullable: true, displayName: 'Total Of Contacts' },
  { name: 'of_emails', type: 'integer', nullable: true, displayName: 'Of Emails' },
  { name: 'of_meetings', type: 'integer', nullable: true, displayName: 'Of Meetings' },
  { name: 'delta', type: 'integer', nullable: true, displayName: 'Delta' },
  { name: 'days_since_last_email', type: 'numeric', nullable: true, displayName: 'Days Since Last Email' },
  { name: 'days_since_last_meeting', type: 'numeric', nullable: true, displayName: 'Days Since Last Meeting' },
  { name: 'no_of_lg_focus_areas', type: 'integer', nullable: true, displayName: 'No Of LG Focus Areas' },
  { name: 'all_opps', type: 'integer', nullable: true, displayName: 'All Opps' },
  { name: 'no_of_opps_sourced', type: 'integer', nullable: true, displayName: 'No Of Opps Sourced' },
  { name: 'email_from', type: 'text', nullable: true, displayName: 'Email From' },
  { name: 'email_to', type: 'text', nullable: true, displayName: 'Email To' },
  { name: 'email_cc', type: 'text', nullable: true, displayName: 'Email CC' },
  { name: 'meeting_from', type: 'text', nullable: true, displayName: 'Meeting From' },
  { name: 'meeting_to', type: 'text', nullable: true, displayName: 'Meeting To' },
  { name: 'meeting_cc', type: 'text', nullable: true, displayName: 'Meeting CC' },
  { name: 'all_emails', type: 'text', nullable: true, displayName: 'All Emails' },
  { name: 'city', type: 'text', nullable: true, displayName: 'City' },
  { name: 'state', type: 'text', nullable: true, displayName: 'State' },
  { name: 'created_at', type: 'timestamp with time zone', nullable: true, displayName: 'Created At' },
  { name: 'updated_at', type: 'timestamp with time zone', nullable: true, displayName: 'Updated At' },
];

export const OPPORTUNITIES_RAW_COLUMNS: TableColumn[] = [
  { name: 'tier', type: 'text', nullable: true, displayName: 'Tier' },
  { name: 'sector', type: 'text', nullable: true, displayName: 'LG Sector' },
  { name: 'lg_focus_area', type: 'text', nullable: true, displayName: 'LG Focus Area' },
  { name: 'deal_name', type: 'text', nullable: true, displayName: 'Deal Name' },
  { name: 'summary_of_opportunity', type: 'text', nullable: true, displayName: 'Description' },
  { name: 'next_steps', type: 'text', nullable: true, displayName: 'Next Steps' },
  { name: 'headquarters', type: 'text', nullable: true, displayName: 'HQ' },
  { name: 'platform_add_on', type: 'text', nullable: true, displayName: 'Platform / Add-On' },
  { name: 'revenue', type: 'numeric', nullable: true, displayName: 'Revenue' },
  { name: 'ebitda_in_ms', type: 'numeric', nullable: true, displayName: 'EBITDA' },
  { name: 'ebitda_notes', type: 'text', nullable: true, displayName: 'EBITDA Notes' },
  { name: 'est_deal_size', type: 'numeric', nullable: true, displayName: 'Est. Deal Size' },
  { name: 'est_lg_equity_invest', type: 'numeric', nullable: true, displayName: 'Est. LG Equity Invest.' },
  { name: 'lg_team', type: 'text', nullable: true, displayName: 'LG Team' },
  { name: 'deal_source_company', type: 'text', nullable: true, displayName: 'Deal Source Company' },
  { name: 'deal_source_contacts', type: 'text', nullable: true, displayName: 'Deal Source Contacts' },
  { name: 'ownership_type', type: 'text', nullable: true, displayName: 'Ownership Type' },
  { name: 'ownership', type: 'text', nullable: true, displayName: 'Ownership' },
  { name: 'status', type: 'text', nullable: true, displayName: 'Status' },
  { name: 'updated_at', type: 'timestamp with time zone', nullable: true, displayName: 'Last Modified' },
  { name: 'date_of_origination', type: 'text', nullable: true, displayName: 'Date of Origination' },
  { name: 'dealcloud', type: 'boolean', nullable: true, displayName: 'Deal Cloud' },
  { name: 'id', type: 'uuid', nullable: false, displayName: 'ID' },
  { name: 'url', type: 'text', nullable: true, displayName: 'URL' },
  { name: 'most_recent_notes', type: 'text', nullable: true, displayName: 'Notes' },
  { name: 'investment_professional_point_person_1', type: 'text', nullable: true, displayName: 'LG Lead #1' },
  { name: 'investment_professional_point_person_2', type: 'text', nullable: true, displayName: 'LG Lead #2' },
  { name: 'deal_source_individual_1', type: 'text', nullable: true, displayName: 'Deal Source Contact #1' },
  { name: 'deal_source_individual_2', type: 'text', nullable: true, displayName: 'Deal Source Contact #2' },
  { name: 'created_at', type: 'timestamp with time zone', nullable: true, displayName: 'Created At' },
  
  { name: 'last_modified', type: 'timestamp with time zone', nullable: true, displayName: 'Last Modified Date' },
];