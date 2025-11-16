/**
 * Comprehensive column mapping for opportunities_raw table
 * Maps CSV headers (user-friendly names) to actual Supabase column names
 */

// All valid columns in opportunities_raw (from Supabase schema)
export const OPPORTUNITY_DB_COLUMNS = [
  'id',
  'deal_name',
  'tier',
  'sector',
  'lg_focus_area',
  'platform_add_on',
  'next_steps',
  'next_steps_due_date',
  'summary_of_opportunity',
  'most_recent_notes',
  'url',
  'headquarters',
  'ebitda',
  'ebitda_in_ms',
  'ebitda_notes',
  'revenue',
  'est_deal_size',
  'est_lg_equity_invest',
  'ownership',
  'ownership_type',
  'status',
  'date_of_origination',
  'last_modified',
  'process_timeline',
  'Process Timeline', // Note: DB has both snake_case and title case
  'acquisition_date',
  'deal_source_company',
  'deal_source_contacts',
  'deal_source_individual_1',
  'deal_source_individual_2',
  'deal_source_contact_1_id',
  'deal_source_contact_2_id',
  'lg_team',
  'investment_professional_point_person_1',
  'investment_professional_point_person_2',
  'investment_professional_point_person_3',
  'investment_professional_point_person_4',
  'dealcloud',
  'created_at',
  'updated_at',
  'assigned_to',
  'created_by',
  'organization_id',
  'funds',
] as const;

// CSV header to Supabase column mapping
export const OPPORTUNITY_COLUMN_MAP: Record<string, string> = {
  // Core identity
  'ID': 'id',
  'Id': 'id',
  'id': 'id',

  // High level deal info
  'Deal Name': 'deal_name',
  'deal_name': 'deal_name',
  'Tier': 'tier',
  'tier': 'tier',
  'LG Sector': 'sector',
  'Sector': 'sector',
  'sector': 'sector',
  'LG Focus Area': 'lg_focus_area',
  'Focus Area': 'lg_focus_area',
  'lg_focus_area': 'lg_focus_area',
  'Platform / Add-On': 'platform_add_on',
  'Platform/Add-On': 'platform_add_on',
  'Platform Add-On': 'platform_add_on',
  'platform_add_on': 'platform_add_on',

  // Descriptions and notes
  'Next Steps': 'next_steps',
  'next_steps': 'next_steps',
  'Next Steps Due Date': 'next_steps_due_date',
  'next_steps_due_date': 'next_steps_due_date',
  'Summary of Opportunity': 'summary_of_opportunity',
  'summary_of_opportunity': 'summary_of_opportunity',
  'Most Recent Notes': 'most_recent_notes',
  'most_recent_notes': 'most_recent_notes',

  // URLs and HQ
  'URL': 'url',
  'Url': 'url',
  'url': 'url',
  'HQ': 'headquarters',
  'Headquarters': 'headquarters',
  'headquarters': 'headquarters',

  // Numbers
  'EBITDA (in millions)': 'ebitda_in_ms',
  'EBITDA in M$': 'ebitda_in_ms',
  'EBITDA in MS': 'ebitda_in_ms',
  'ebitda_in_ms': 'ebitda_in_ms',
  'EBITDA': 'ebitda',
  'ebitda': 'ebitda',
  'EBITDA Notes': 'ebitda_notes',
  'ebitda_notes': 'ebitda_notes',
  'Revenue': 'revenue',
  'revenue': 'revenue',
  'Est. Deal Size': 'est_deal_size',
  'Est Deal Size': 'est_deal_size',
  'est_deal_size': 'est_deal_size',
  'Est. LG Equity Invest.': 'est_lg_equity_invest',
  'Est LG Equity Invest': 'est_lg_equity_invest',
  'est_lg_equity_invest': 'est_lg_equity_invest',

  // Ownership
  'Ownership': 'ownership',
  'ownership': 'ownership',
  'Ownership Type': 'ownership_type',
  'ownership_type': 'ownership_type',

  // Status and dates
  'Status': 'status',
  'status': 'status',
  'Date of Origination': 'date_of_origination',
  'date_of_origination': 'date_of_origination',
  'Last Modified': 'last_modified',
  'last_modified': 'last_modified',
  'Process Timeline': 'process_timeline',
  'process_timeline': 'process_timeline',
  'Acquisition Date': 'acquisition_date',
  'acquisition_date': 'acquisition_date',

  // Deal source info
  'Deal Source Company': 'deal_source_company',
  'deal_source_company': 'deal_source_company',
  'Deal Source Contacts': 'deal_source_contacts',
  'deal_source_contacts': 'deal_source_contacts',
  'Deal Source Individual 1': 'deal_source_individual_1',
  'deal_source_individual_1': 'deal_source_individual_1',
  'Deal Source Individual 2': 'deal_source_individual_2',
  'deal_source_individual_2': 'deal_source_individual_2',
  'Deal Source Contact 1 Id': 'deal_source_contact_1_id',
  'Deal Source Contact 1 ID': 'deal_source_contact_1_id',
  'deal_source_contact_1_id': 'deal_source_contact_1_id',
  'Deal Source Contact 2 Id': 'deal_source_contact_2_id',
  'Deal Source Contact 2 ID': 'deal_source_contact_2_id',
  'deal_source_contact_2_id': 'deal_source_contact_2_id',

  // LG / investment team
  'LG Team': 'lg_team',
  'lg_team': 'lg_team',
  'Investment Professional Point Person 1': 'investment_professional_point_person_1',
  'investment_professional_point_person_1': 'investment_professional_point_person_1',
  'Investment Professional Point Person 2': 'investment_professional_point_person_2',
  'investment_professional_point_person_2': 'investment_professional_point_person_2',
  'Investment Professional Point Person 3': 'investment_professional_point_person_3',
  'investment_professional_point_person_3': 'investment_professional_point_person_3',
  'Investment Professional Point Person 4': 'investment_professional_point_person_4',
  'investment_professional_point_person_4': 'investment_professional_point_person_4',

  // System fields
  'DealCloud': 'dealcloud',
  'dealcloud': 'dealcloud',
  'Created At': 'created_at',
  'created_at': 'created_at',
  'Updated At': 'updated_at',
  'updated_at': 'updated_at',
  'Assigned To': 'assigned_to',
  'assigned_to': 'assigned_to',
  'Created By': 'created_by',
  'created_by': 'created_by',
  'Organization ID': 'organization_id',
  'organization_id': 'organization_id',
  'Funds': 'funds',
  'funds': 'funds',
};

/**
 * Normalize header by trimming whitespace
 */
function normalizeHeader(header: string): string {
  return header.trim();
}

/**
 * Convert header to snake_case format
 */
function toSnakeCaseHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/#/g, '')
    .replace(/\$/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Map a CSV header to its corresponding Supabase column name
 * Uses multiple strategies in order of priority:
 * 1. Exact match to real DB column
 * 2. Explicit mapping from OPPORTUNITY_COLUMN_MAP
 * 3. Snake_case fallback (only if it matches a real column)
 * 4. Returns null if no match found (column will be ignored)
 */
export function mapHeaderToColumn(header: string): string | null {
  const raw = normalizeHeader(header);

  // 1. Exact match to real column (handles both snake_case and friendly names in DB)
  if (OPPORTUNITY_DB_COLUMNS.includes(raw as any)) {
    return raw;
  }

  // 2. Explicit mapping for UI / CSV labels
  if (OPPORTUNITY_COLUMN_MAP[raw]) {
    return OPPORTUNITY_COLUMN_MAP[raw];
  }

  // 3. Snake_case fallback, but only if it is a real column
  const fallback = toSnakeCaseHeader(raw);
  if (OPPORTUNITY_DB_COLUMNS.includes(fallback as any)) {
    return fallback;
  }

  // 4. Unknown → ignore column completely
  return null;
}

/**
 * Map all headers in a CSV row to their Supabase column names
 * Returns a new object with only valid, mapped columns
 */
export function mapRowToDbColumns(row: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  for (const [header, value] of Object.entries(row)) {
    const dbColumn = mapHeaderToColumn(header);
    if (dbColumn !== null) {
      mapped[dbColumn] = value;
    }
  }
  
  return mapped;
}

/**
 * Map an array of CSV rows to use Supabase column names
 */
export function mapRowsToDbColumns(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map(row => mapRowToDbColumns(row));
}
