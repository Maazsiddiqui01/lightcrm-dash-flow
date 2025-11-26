/**
 * View Dependencies Registry
 * 
 * Maps base tables to their dependent views and defines which columns
 * must be present in views for filtering and display purposes.
 * 
 * This registry is used by the schema validator to detect missing columns
 * that would cause "Failed to fetch" errors when filtering.
 */

export interface ViewDependency {
  views: string[];
  filterableColumns: string[];
  excludedColumns?: string[]; // Columns that intentionally don't need to be in views
}

/**
 * Registry of base tables and their dependent views
 * 
 * When adding a new column to a base table:
 * 1. If it's filterable/displayable, add it to filterableColumns
 * 2. Update ALL dependent views to include the new column
 * 3. Run schema validation to verify synchronization
 */
export const VIEW_DEPENDENCIES: Record<string, ViewDependency> = {
  opportunities_raw: {
    views: ['opportunities_with_display_fields'],
    filterableColumns: [
      // Core fields
      'id',
      'deal_name',
      'url',
      'summary_of_opportunity',
      
      // Categorization
      'lg_focus_area',
      'sector',
      'platform_add_on',
      'tier',
      'status',
      
      // Financial
      'ebitda_in_ms',
      'ebitda',
      'ebitda_notes',
      'revenue',
      'est_deal_size',
      'est_lg_equity_invest',
      'ownership',
      'ownership_type',
      
      // Investment team
      'investment_professional_point_person_1',
      'investment_professional_point_person_2',
      'investment_professional_point_person_3',
      'investment_professional_point_person_4',
      'lg_team',
      
      // Deal source
      'deal_source_company',
      'deal_source_individual_1',
      'deal_source_individual_2',
      'deal_source_contacts',
      'deal_source_contact_1_id',
      'deal_source_contact_2_id',
      
      // Dates
      'date_of_origination',
      'acquisition_date',
      'created_at',
      'updated_at',
      'last_modified',
      
      // Activity tracking
      'next_steps',
      'next_steps_due_date',
      'most_recent_notes',
      'process_timeline',
      'Process Timeline',
      
      // Location
      'headquarters',
      
      // Integrations
      'dealcloud',
      'priority',
      
      // Funds
      'funds',
      
      // Ownership
      'assigned_to',
      'created_by',
      'organization_id',
    ],
    excludedColumns: [
      // Computed fields that don't exist in base table
      'next_steps_display',
      'notes_display',
      'next_steps_due_date_display',
    ]
  },
  
  contacts_raw: {
    views: ['contacts_app', 'contacts_norm', 'contacts_with_display_fields'],
    filterableColumns: [
      // Core identity
      'id',
      'first_name',
      'last_name',
      'full_name',
      'email_address',
      'phone',
      
      // Organization
      'organization',
      'organization_id',
      'title',
      'city',
      'state',
      
      // Categorization
      'lg_focus_area_1',
      'lg_focus_area_2',
      'lg_focus_area_3',
      'lg_focus_area_4',
      'lg_focus_area_5',
      'lg_focus_area_6',
      'lg_focus_area_7',
      'lg_focus_area_8',
      'lg_focus_areas_comprehensive_list',
      'no_of_lg_focus_areas',
      'lg_sector',
      'lg_lead',
      'lg_assistant',
      'areas_of_specialization',
      'category',
      'contact_type',
      
      // Activity metrics
      'of_emails',
      'of_meetings',
      'total_of_contacts',
      'days_since_last_email',
      'days_since_last_meeting',
      'latest_contact_email',
      'latest_contact_meeting',
      'most_recent_contact',
      
      // Outreach tracking
      'follow_up_date',
      'follow_up_days',
      'follow_up_recency_threshold',
      'outreach_date',
      'delta',
      'delta_type',
      'intentional_no_outreach',
      'intentional_no_outreach_date',
      'intentional_no_outreach_note',
      
      // Notes and next steps
      'notes',
      'next_steps',
      'next_steps_due_date',
      
      // Group fields
      'group_contact',
      'group_delta',
      'group_email_role',
      'group_focus_area',
      'group_notes',
      'group_sector',
      'most_recent_group_contact',
      
      // Opportunities
      'all_opps',
      'no_of_opps_sourced',
      
      // Social/Web
      'linkedin_url',
      'x_twitter_url',
      'url_to_online_bio',
      
      // Email details (for display)
      'all_emails',
      'email_from',
      'email_to',
      'email_cc',
      'email_subject',
      'meeting_from',
      'meeting_to',
      'meeting_cc',
      'meeting_title',
      
      // System fields
      'created_at',
      'updated_at',
      'created_by',
      'assigned_to',
      
      // Locking
      'locked_by',
      'locked_until',
      'lock_reason',
      
      // Priority
      'priority',
    ],
    excludedColumns: [
      // Computed fields
      'notes_display',
      'next_steps_display',
    ]
  },
};

/**
 * Get all base tables that have view dependencies
 */
export function getBaseTablesWithViews(): string[] {
  return Object.keys(VIEW_DEPENDENCIES);
}

/**
 * Get dependent views for a specific base table
 */
export function getViewsForTable(tableName: string): string[] {
  return VIEW_DEPENDENCIES[tableName]?.views || [];
}

/**
 * Get filterable columns for a specific base table
 */
export function getFilterableColumns(tableName: string): string[] {
  return VIEW_DEPENDENCIES[tableName]?.filterableColumns || [];
}

/**
 * Get excluded columns (computed fields) for a specific base table
 */
export function getExcludedColumns(tableName: string): string[] {
  return VIEW_DEPENDENCIES[tableName]?.excludedColumns || [];
}

/**
 * Check if a column should be in views for a given table
 */
export function shouldColumnBeInView(tableName: string, columnName: string): boolean {
  const dependency = VIEW_DEPENDENCIES[tableName];
  if (!dependency) return false;
  
  const isExcluded = dependency.excludedColumns?.includes(columnName) || false;
  const isFilterable = dependency.filterableColumns.includes(columnName);
  
  return isFilterable && !isExcluded;
}
