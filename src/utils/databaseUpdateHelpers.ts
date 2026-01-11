/**
 * Safe Database Update Utilities
 * 
 * CRITICAL: This module enforces field whitelisting for all database updates
 * to prevent NULL constraint violations and unauthorized field modifications.
 * 
 * NEVER spread entire objects into database updates. ALWAYS use these helpers.
 */

/**
 * Whitelists of safe fields for each table
 * 
 * IMPORTANT: System fields are explicitly excluded:
 * - id (managed by database)
 * - created_at (set once on creation)
 * - created_by (set once on creation)
 * - email_address (managed via contact_email_addresses table)
 * - Any other fields with NOT NULL constraints that shouldn't be overwritten
 */
export const SAFE_UPDATE_FIELDS = {
  contacts_raw: [
    // Identity fields
    'full_name',
    'first_name', 
    'last_name',
    'phone',
    'title',
    'organization',
    
    // Professional info
    'areas_of_specialization',
    'lg_sector',
    'lg_focus_area_1',
    'lg_focus_area_2',
    'lg_focus_area_3',
    'lg_focus_area_4',
    'lg_focus_area_5',
    'lg_focus_area_6',
    'lg_focus_area_7',
    'lg_focus_area_8',
    'category',
    
    // Interaction tracking
    'delta',
    'delta_type',
    'notes',
    'next_steps',
    'next_steps_due_date',
    
    // URLs
    'url_to_online_bio',
    'linkedin_url',
    'x_twitter_url',
    
    // Team assignments
    'lg_lead',
    'lg_assistant',
    
    // Group fields (read-only for display, writable in special cases)
    'group_contact',
    'group_email_role',
    'group_focus_area',
    'group_sector',
    'group_notes',
    
    // Location
    'city',
    'state',
    
    // Type and flags
    'contact_type',
    'intentional_no_outreach',
    'priority',
    
    // Follow-up configuration
    'follow_up_days',
    'follow_up_recency_threshold',
    
    // System timestamp (always allow)
    'updated_at',
    
    // EXPLICITLY EXCLUDED:
    // - id (never update)
    // - created_at (never update)
    // - created_by (never update)
    // - email_address (managed via contact_email_addresses table)
    // - group_delta (computed field, read-only)
    // - follow_up_date (computed via trigger)
  ],
  
  opportunities_raw: [
    // Core fields
    'deal_name',
    'lg_focus_area',
    'sector',
    'funds',
    'platform_add_on',
    'tier',
    'status',
    'url',
    
    // Descriptions
    'summary_of_opportunity',
    'next_steps',
    'most_recent_notes',
    
    // Financial
    'ebitda_in_ms',
    'ebitda',
    'ebitda_notes',
    'revenue',
    'est_deal_size',
    'est_lg_equity_invest',
    
    // Ownership
    'ownership',
    'ownership_type',
    
    // Team
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
    'date_of_origination',
    
    // Details
    'dealcloud',
    'priority',
    'headquarters',
    'process_timeline',
    'acquisition_date',
    'last_modified',
    
    // System timestamp
    'updated_at',
    
    // EXPLICITLY EXCLUDED:
    // - id (never update)
    // - created_at (never update)
    // - created_by (never update)
  ],
  
  groups: [
    // Core fields
    'name',
    'max_lag_days',
    'focus_area',
    'sector',
    'notes',
    
    // System timestamp
    'updated_at',
    
    // EXPLICITLY EXCLUDED:
    // - id (never update)
    // - created_at (never update)
    // - created_by (never update)
    // - user_id (set on creation, should not be modified)
  ],
  
  lg_horizons_companies: [
    // Core fields
    'priority',
    'company_name',
    'company_url',
    'sector',
    'subsector',
    'ebitda',
    'ebitda_numeric',
    'revenue',
    'revenue_numeric',
    'ownership',
    'parent_gp_name',
    'parent_gp_id',
    'gp_aum',
    'gp_aum_numeric',
    'lg_relationship',
    'gp_contact',
    'process_status',
    'original_date',
    'latest_process_date',
    'company_hq_city',
    'company_hq_state',
    'date_of_acquisition',
    'description',
    'additional_size_info',
    'additional_information',
    'source',
    
    // System timestamp
    'updated_at',
  ],
  
  lg_horizons_gps: [
    // Core fields
    'priority',
    'index_number',
    'gp_name',
    'gp_url',
    'lg_relationship',
    'gp_contact',
    'aum',
    'aum_numeric',
    'fund_hq_city',
    'fund_hq_state',
    'active_funds',
    'total_funds',
    'active_holdings',
    'industry_sector_focus',
    
    // System timestamp
    'updated_at',
  ]
} as const;

/**
 * Get safe update object with only whitelisted fields
 * 
 * @param tableName - Table to update ('contacts_raw' | 'opportunities_raw')
 * @param data - Raw data object
 * @param preserveFields - Additional fields to preserve (use with caution)
 * @returns Safe object containing only whitelisted fields
 * 
 * @example
 * ```typescript
 * const updates = editedRowIds.map(rowId => ({
 *   id: rowId,
 *   ...getSafeUpdate('contacts_raw', editState.editedRows[rowId]),
 *   updated_at: new Date().toISOString(),
 * }));
 * ```
 */
// Fields that are integer type and should convert empty string to null
const INTEGER_FIELDS: Record<string, string[]> = {
  contacts_raw: ['delta', 'follow_up_days', 'follow_up_recency_threshold'],
  opportunities_raw: ['priority'],
  lg_horizons_companies: ['priority', 'ebitda_numeric', 'revenue_numeric', 'gp_aum_numeric'],
  lg_horizons_gps: ['priority', 'aum_numeric', 'active_funds', 'total_funds', 'active_holdings'],
  groups: ['max_lag_days'],
};

export function getSafeUpdate<T extends keyof typeof SAFE_UPDATE_FIELDS>(
  tableName: T,
  data: Record<string, any>,
  preserveFields: string[] = []
): Record<string, any> {
  const allowedFields = [
    ...SAFE_UPDATE_FIELDS[tableName],
    ...preserveFields
  ];
  
  const integerFields = INTEGER_FIELDS[tableName] || [];
  
  const safeData: Record<string, any> = {};
  for (const field of allowedFields) {
    if (field in data) {
      let value = data[field];
      
      // Convert empty strings to null for integer fields
      if (integerFields.includes(field) && value === '') {
        value = null;
      }
      
      safeData[field] = value;
    }
  }
  
  // Log if fields were excluded for debugging
  const excludedFields = Object.keys(data).filter(f => !(f in safeData));
  if (excludedFields.length > 0) {
    console.debug(`[Safe Update] Excluded fields for ${tableName}:`, excludedFields);
  }
  
  return safeData;
}

/**
 * Validate that an update object doesn't contain forbidden fields
 * 
 * @param tableName - Table name
 * @param data - Data to validate
 * @returns Validation result with any violations
 */
export function validateUpdate(
  tableName: keyof typeof SAFE_UPDATE_FIELDS,
  data: Record<string, any>
): { valid: boolean; violations: string[] } {
  const forbiddenFields = ['id', 'created_at', 'created_by'];
  
  // Additional forbidden fields by table
  if (tableName === 'contacts_raw') {
    forbiddenFields.push('email_address', 'group_delta', 'follow_up_date');
  } else if (tableName === 'groups') {
    forbiddenFields.push('user_id');
  }
  
  const violations = forbiddenFields.filter(field => field in data);
  
  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Clean a row for database insertion/update
 * Removes internal tracking fields and ensures safe field list
 * 
 * @param row - Row data
 * @param tableName - Table name
 * @returns Cleaned row data
 */
export function cleanRowForDatabase<T extends keyof typeof SAFE_UPDATE_FIELDS>(
  row: Record<string, any>,
  tableName: T
): Record<string, any> {
  // Remove internal tracking fields
  const { _rowNumber, __intent, ...cleanRow } = row;
  
  // Apply safe field whitelist
  return getSafeUpdate(tableName, cleanRow);
}
