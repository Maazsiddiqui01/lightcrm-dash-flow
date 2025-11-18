import { supabase } from "@/integrations/supabase/client";

export interface ColumnMapping {
  csvHeader: string;
  columnName: string;
  displayName: string;
}

export interface ColumnMapResult {
  mappings: ColumnMapping[];
  unmapped: string[];
  displayToColumn: Map<string, string>;
  columnToDisplay: Map<string, string>;
}

/**
 * Creates bidirectional mapping between display names and column names
 */
export async function createColumnMap(
  entityType: 'contacts' | 'opportunities'
): Promise<ColumnMapResult> {
  const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
  
  const { data: columns, error } = await supabase
    .from('column_configurations')
    .select('column_name, display_name, is_editable')
    .eq('table_name', tableName)
    .eq('is_editable', true);

  if (error) {
    console.error('Failed to fetch column configurations:', error);
    // We do not throw here to allow fallback mappings to work even if this table is empty
  }
  
  const displayToColumn = new Map<string, string>();
  const columnToDisplay = new Map<string, string>();

  // Helper to add a mapping with multiple variations
  const addMapping = (display: string, column: string) => {
    const variations = [
      display,
      display.toLowerCase().trim(),
      display.replace(/[_\s-]+/g, ' ').trim(),
      display.replace(/[_\s-]+/g, ' ').toLowerCase().trim(),
    ];
    const columnVariations = [
      column,
      column.toLowerCase().trim(),
      column.replace(/[_\s-]+/g, ' ').toLowerCase().trim(),
    ];

    // Map display variations to the exact column name
    variations.forEach(v => displayToColumn.set(v, column));
    // Also map common column variations back to column
    columnVariations.forEach(v => displayToColumn.set(v, column));

    // Reverse mapping for display label (keep the first friendly display)
    if (!columnToDisplay.has(column)) columnToDisplay.set(column, display);
  };

  // 1) Seed from DB configuration if any
  (columns || []).forEach(col => {
    const display = (col.display_name || col.column_name).trim();
    const column = col.column_name.trim();
    addMapping(display, column);
  });
  
  // 2) Add robust built-in fallbacks for common headers (Excel-friendly)
  if (entityType === 'opportunities') {
    const fallback: Record<string, string> = {
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
      'Description': 'summary_of_opportunity',
      'summary_of_opportunity': 'summary_of_opportunity',
      'Notes': 'most_recent_notes',
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
      'Funds': 'funds',
      'funds': 'funds',
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
    };
    Object.entries(fallback).forEach(([disp, col]) => addMapping(disp, col));
  } else {
    const fallback: Record<string, string> = {
      'Full Name': 'full_name',
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'Email': 'email_address',
      'Phone': 'phone',
      'Organization': 'organization',
      'Title': 'title',
      'Notes': 'notes',
      'LG Sector': 'lg_sector',
      'LG Focus Area': 'lg_focus_area_1',
      'ID': 'id',
    };
    Object.entries(fallback).forEach(([disp, col]) => addMapping(disp, col));
  }
  
  // Always ensure ID exists
  addMapping('id', 'id');
  addMapping('ID', 'id');

  return {
    mappings: [],
    unmapped: [],
    displayToColumn,
    columnToDisplay
  };
}

/**
 * Maps CSV headers to database column names with intelligent matching
 * Handles common variations in header naming (case, separators, etc.)
 */
export function mapCsvHeaders(
  csvHeaders: string[],
  displayToColumn: Map<string, string>
): { mapped: Map<string, string>; unmapped: string[] } {
  const mapped = new Map<string, string>();
  const unmapped: string[] = [];
  
  // Generate common variations to try for each header
  const generateVariations = (header: string): string[] => [
    header.trim(),                              // Exact
    header.toLowerCase().trim(),                // Lowercase
    header.replace(/[_\s-]+/g, '').toLowerCase(), // Remove separators
    header.replace(/[_\s-]+/g, '_').toLowerCase(), // Normalize to underscore
    header.replace(/[_\s-]+/g, ' ').toLowerCase()  // Normalize to space
  ];
  
  csvHeaders.forEach(header => {
    const trimmed = header.trim();
    
    // Try all variations until we find a match
    let columnName: string | undefined;
    for (const variant of generateVariations(trimmed)) {
      columnName = displayToColumn.get(variant);
      if (columnName) break;
    }
    
    if (columnName) {
      mapped.set(header, columnName);
    } else {
      unmapped.push(header);
    }
  });
  
  return { mapped, unmapped };
}

/**
 * Transforms parsed CSV data using column mappings
 * ONLY includes mapped columns and internal tracking fields
 * Unmapped columns are silently ignored
 */
export function transformCsvData(
  parsedData: any[],
  headerMapping: Map<string, string>
): any[] {
  const INTERNAL_FIELDS = ['_rowNumber'];
  
  return parsedData.map(row => {
    const transformed: any = {};
    
    Object.entries(row).forEach(([csvHeader, value]) => {
      // Always keep internal tracking fields
      if (INTERNAL_FIELDS.includes(csvHeader)) {
        transformed[csvHeader] = value;
        return;
      }
      
      // Only include columns that have mappings
      const columnName = headerMapping.get(csvHeader);
      if (columnName) {
        transformed[columnName] = value;
      }
      // Silently ignore unmapped columns - don't add them to transformed data
    });
    
    return transformed;
  });
}
