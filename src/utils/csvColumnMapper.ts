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
    throw new Error('Failed to load column mappings');
  }
  
  const displayToColumn = new Map<string, string>();
  const columnToDisplay = new Map<string, string>();
  
  (columns || []).forEach(col => {
    const display = col.display_name || col.column_name;
    const column = col.column_name;
    
    // Map display name (case-insensitive)
    displayToColumn.set(display.toLowerCase().trim(), column);
    displayToColumn.set(display.trim(), column);
    
    // Map column name as fallback
    displayToColumn.set(column.toLowerCase().trim(), column);
    displayToColumn.set(column.trim(), column);
    
    // Reverse mapping for display
    columnToDisplay.set(column, display);
  });
  
  // Always map 'id' column
  displayToColumn.set('id', 'id');
  displayToColumn.set('ID', 'id');
  columnToDisplay.set('id', 'ID');
  
  return {
    mappings: [],
    unmapped: [],
    displayToColumn,
    columnToDisplay
  };
}

/**
 * Maps CSV headers to database column names
 */
export function mapCsvHeaders(
  csvHeaders: string[],
  displayToColumn: Map<string, string>
): { mapped: Map<string, string>; unmapped: string[] } {
  const mapped = new Map<string, string>();
  const unmapped: string[] = [];
  
  csvHeaders.forEach(header => {
    const trimmed = header.trim();
    const normalized = trimmed.toLowerCase();
    
    // Try exact match first, then case-insensitive
    const columnName = displayToColumn.get(trimmed) || displayToColumn.get(normalized);
    
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
 */
export function transformCsvData(
  parsedData: any[],
  headerMapping: Map<string, string>
): any[] {
  return parsedData.map(row => {
    const transformed: any = {};
    
    Object.entries(row).forEach(([csvHeader, value]) => {
      if (csvHeader === '_rowNumber') {
        transformed._rowNumber = value;
        return;
      }
      
      const columnName = headerMapping.get(csvHeader);
      if (columnName) {
        transformed[columnName] = value;
      }
    });
    
    return transformed;
  });
}
