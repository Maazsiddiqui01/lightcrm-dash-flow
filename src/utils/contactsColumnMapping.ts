/**
 * Comprehensive column mapping for contacts_raw table
 * Maps CSV headers (user-friendly names) to actual Supabase column names
 */

// All valid columns in contacts_raw (from Supabase schema)
export const CONTACT_DB_COLUMNS = [
  'id',
  'full_name',
  'first_name',
  'last_name',
  'email_address',
  'organization',
  'organization_id',
  'title',
  'phone',
  'category',
  'notes',
  'areas_of_specialization',
  'lg_sector',
  'lg_focus_areas_comprehensive_list',
  'lg_focus_area_1',
  'lg_focus_area_2',
  'lg_focus_area_3',
  'lg_focus_area_4',
  'lg_focus_area_5',
  'lg_focus_area_6',
  'lg_focus_area_7',
  'lg_focus_area_8',
  'no_of_lg_focus_areas',
  'delta_type',
  'delta',
  'group_delta',
  'url_to_online_bio',
  'linkedin_url',
  'x_twitter_url',
  'contact_type',
  'most_recent_contact',
  'latest_contact_email',
  'latest_contact_meeting',
  'total_of_contacts',
  'of_emails',
  'of_meetings',
  'days_since_last_email',
  'days_since_last_meeting',
  'no_of_opps_sourced',
  'all_opps',
  'all_emails',
  'outreach_date',
  'intentional_no_outreach',
  'intentional_no_outreach_date',
  'intentional_no_outreach_note',
  'email_subject',
  'meeting_title',
  'email_from',
  'email_to',
  'email_cc',
  'meeting_from',
  'meeting_to',
  'meeting_cc',
  'assigned_to',
  'created_by',
  'city',
  'state',
  'follow_up_date',
  'follow_up_days',
  'follow_up_recency_threshold',
  'next_steps',
  'next_steps_due_date',
  'group_contact',
  'group_email_role',
  'group_focus_area',
  'group_notes',
  'group_sector',
  'most_recent_group_contact',
  'lg_assistant',
  'lg_lead',
  'created_at',
  'updated_at',
  'locked_by',
  'locked_until',
  'lock_reason',
] as const;

// Read-only columns that should never be written to during import
// These are either generated columns, system-managed, or UI-only computed fields
export const READ_ONLY_CONTACT_COLUMNS = [
  // System-managed timestamps
  'created_at',
  'updated_at',
  
  // System fields
  'locked_by',
  'locked_until',
  'lock_reason',
  'organization_id',
  'created_by',
  
  // Database-computed fields (managed by triggers)
  'follow_up_date',  // Computed from follow_up_days
  'group_delta',     // Computed field
  
  // UI-only computed fields that don't exist in DB
  'mapped_sectors',
  'days_over_under_max_lag',
  'actions',
  'opportunities',
] as const;

// CSV header to Supabase column mapping
export const CONTACT_COLUMN_MAP: Record<string, string> = {
  // Core identity
  'ID': 'id',
  'Id': 'id',
  'id': 'id',

  // Name fields
  'Full Name': 'full_name',
  'full_name': 'full_name',
  'Name': 'full_name',
  'First Name': 'first_name',
  'first_name': 'first_name',
  'Last Name': 'last_name',
  'last_name': 'last_name',

  // Contact info
  'Email': 'email_address',
  'Email Address': 'email_address',
  'email_address': 'email_address',
  'email': 'email_address',
  'Phone': 'phone',
  'phone': 'phone',
  'Phone Number': 'phone',

  // Organization
  'Organization': 'organization',
  'organization': 'organization',
  'Company': 'organization',
  'Title': 'title',
  'title': 'title',
  'Job Title': 'title',

  // Location
  'City': 'city',
  'city': 'city',
  'State': 'state',
  'state': 'state',

  // Category and type
  'Category': 'category',
  'category': 'category',
  'Contact Type': 'contact_type',
  'contact_type': 'contact_type',

  // Notes and specialization
  'Notes': 'notes',
  'notes': 'notes',
  'Areas of Specialization': 'areas_of_specialization',
  'areas_of_specialization': 'areas_of_specialization',
  'Specialization': 'areas_of_specialization',

  // LG Fields
  'LG Sector': 'lg_sector',
  'Sector': 'lg_sector',
  'lg_sector': 'lg_sector',
  'LG Focus Areas Comprehensive List': 'lg_focus_areas_comprehensive_list',
  'lg_focus_areas_comprehensive_list': 'lg_focus_areas_comprehensive_list',
  'Focus Areas': 'lg_focus_areas_comprehensive_list',
  'LG Focus Area 1': 'lg_focus_area_1',
  'lg_focus_area_1': 'lg_focus_area_1',
  'LG Focus Area 2': 'lg_focus_area_2',
  'lg_focus_area_2': 'lg_focus_area_2',
  'LG Focus Area 3': 'lg_focus_area_3',
  'lg_focus_area_3': 'lg_focus_area_3',
  'LG Focus Area 4': 'lg_focus_area_4',
  'lg_focus_area_4': 'lg_focus_area_4',
  'LG Focus Area 5': 'lg_focus_area_5',
  'lg_focus_area_5': 'lg_focus_area_5',
  'LG Focus Area 6': 'lg_focus_area_6',
  'lg_focus_area_6': 'lg_focus_area_6',
  'LG Focus Area 7': 'lg_focus_area_7',
  'lg_focus_area_7': 'lg_focus_area_7',
  'LG Focus Area 8': 'lg_focus_area_8',
  'lg_focus_area_8': 'lg_focus_area_8',
  'No of LG Focus Areas': 'no_of_lg_focus_areas',
  'no_of_lg_focus_areas': 'no_of_lg_focus_areas',
  '# of Focus Areas': 'no_of_lg_focus_areas',
  'LG Lead': 'lg_lead',
  'lg_lead': 'lg_lead',
  'Lead': 'lg_lead',
  'LG Assistant': 'lg_assistant',
  'lg_assistant': 'lg_assistant',
  'Assistant': 'lg_assistant',

  // Delta fields
  'Delta Type': 'delta_type',
  'delta_type': 'delta_type',
  'Delta': 'delta',
  'delta': 'delta',
  'Group Delta': 'group_delta',
  'group_delta': 'group_delta',

  // URLs
  'URL to Online Bio': 'url_to_online_bio',
  'url_to_online_bio': 'url_to_online_bio',
  'Bio URL': 'url_to_online_bio',
  'LinkedIn URL': 'linkedin_url',
  'linkedin_url': 'linkedin_url',
  'LinkedIn': 'linkedin_url',
  'X/Twitter URL': 'x_twitter_url',
  'x_twitter_url': 'x_twitter_url',
  'Twitter': 'x_twitter_url',

  // Contact tracking
  'Most Recent Contact': 'most_recent_contact',
  'most_recent_contact': 'most_recent_contact',
  'Latest Contact Email': 'latest_contact_email',
  'latest_contact_email': 'latest_contact_email',
  'Latest Contact Meeting': 'latest_contact_meeting',
  'latest_contact_meeting': 'latest_contact_meeting',
  'Total # of Contacts': 'total_of_contacts',
  'total_of_contacts': 'total_of_contacts',
  '# of Emails': 'of_emails',
  'of_emails': 'of_emails',
  '# of Meetings': 'of_meetings',
  'of_meetings': 'of_meetings',
  'Days Since Last Email': 'days_since_last_email',
  'days_since_last_email': 'days_since_last_email',
  'Days Since Last Meeting': 'days_since_last_meeting',
  'days_since_last_meeting': 'days_since_last_meeting',

  // Opportunities
  'No of Opps Sourced': 'no_of_opps_sourced',
  'no_of_opps_sourced': 'no_of_opps_sourced',
  '# of Opps': 'no_of_opps_sourced',
  'All Opps': 'all_opps',
  'all_opps': 'all_opps',

  // Email fields
  'All Emails': 'all_emails',
  'all_emails': 'all_emails',
  'Email Subject': 'email_subject',
  'email_subject': 'email_subject',
  'Email From': 'email_from',
  'email_from': 'email_from',
  'Email To': 'email_to',
  'email_to': 'email_to',
  'Email CC': 'email_cc',
  'email_cc': 'email_cc',

  // Meeting fields
  'Meeting Title': 'meeting_title',
  'meeting_title': 'meeting_title',
  'Meeting From': 'meeting_from',
  'meeting_from': 'meeting_from',
  'Meeting To': 'meeting_to',
  'meeting_to': 'meeting_to',
  'Meeting CC': 'meeting_cc',
  'meeting_cc': 'meeting_cc',

  // Assignment
  'Assigned To': 'assigned_to',
  'assigned_to': 'assigned_to',
  'Assigned': 'assigned_to',

  // Follow-up
  'Follow Up Date': 'follow_up_date',
  'follow_up_date': 'follow_up_date',
  'Follow Up Days': 'follow_up_days',
  'follow_up_days': 'follow_up_days',
  'Follow Up Recency Threshold': 'follow_up_recency_threshold',
  'follow_up_recency_threshold': 'follow_up_recency_threshold',

  // Next steps
  'Next Steps': 'next_steps',
  'next_steps': 'next_steps',
  'Next Steps Due Date': 'next_steps_due_date',
  'next_steps_due_date': 'next_steps_due_date',

  // Outreach
  'Outreach Date': 'outreach_date',
  'outreach_date': 'outreach_date',
  'Intentional No Outreach': 'intentional_no_outreach',
  'intentional_no_outreach': 'intentional_no_outreach',
  'No Outreach': 'intentional_no_outreach',
  'Intentional No Outreach Date': 'intentional_no_outreach_date',
  'intentional_no_outreach_date': 'intentional_no_outreach_date',
  'Intentional No Outreach Note': 'intentional_no_outreach_note',
  'intentional_no_outreach_note': 'intentional_no_outreach_note',

  // Group fields
  'Group Contact': 'group_contact',
  'group_contact': 'group_contact',
  'Group Email Role': 'group_email_role',
  'group_email_role': 'group_email_role',
  'Group Focus Area': 'group_focus_area',
  'group_focus_area': 'group_focus_area',
  'Group Notes': 'group_notes',
  'group_notes': 'group_notes',
  'Group Sector': 'group_sector',
  'group_sector': 'group_sector',
  'Most Recent Group Contact': 'most_recent_group_contact',
  'most_recent_group_contact': 'most_recent_group_contact',
};

/**
 * Map a single CSV header to database column name
 */
export function mapContactHeaderToColumn(header: string): string | null {
  const trimmed = header.trim();
  return CONTACT_COLUMN_MAP[trimmed] || null;
}

/**
 * Transform CSV rows to use database column names
 */
export function mapContactRowsToDbColumns(rows: any[]): any[] {
  return rows.map(row => {
    const mappedRow: any = {};
    
    Object.keys(row).forEach(csvHeader => {
      const dbColumn = mapContactHeaderToColumn(csvHeader) || csvHeader;
      mappedRow[dbColumn] = row[csvHeader];
    });
    
    return mappedRow;
  });
}

/**
 * Get columns that can be imported (excludes read-only)
 */
export function getImportableContactColumns(): string[] {
  return CONTACT_DB_COLUMNS.filter(
    col => !READ_ONLY_CONTACT_COLUMNS.includes(col as any)
  );
}
