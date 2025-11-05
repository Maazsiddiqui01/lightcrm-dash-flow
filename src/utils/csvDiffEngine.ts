/**
 * CSV Diff Engine - Compares CSV data with existing database records
 * to detect cell-level changes for visual highlighting
 */

export type ChangeType = 'added' | 'updated' | 'cleared' | 'unchanged';

export interface CellChange {
  oldValue: any;
  newValue: any;
  changeType: ChangeType;
  displayOld: string;
  displayNew: string;
}

export interface RowChanges {
  rowIndex: number;
  recordId: string;
  hasChanges: boolean;
  cellChanges: Record<string, CellChange>;
}

/**
 * Determine the change type by comparing old and new values
 */
export function getChangeType(oldValue: any, newValue: any): ChangeType {
  const oldEmpty = oldValue === null || oldValue === undefined || oldValue === '';
  const newEmpty = newValue === null || newValue === undefined || newValue === '';

  if (oldEmpty && newEmpty) return 'unchanged';
  if (oldEmpty && !newEmpty) return 'added';
  if (!oldEmpty && newEmpty) return 'cleared';
  
  // Normalize for comparison
  const oldStr = String(oldValue).trim().toLowerCase();
  const newStr = String(newValue).trim().toLowerCase();
  
  if (oldStr === newStr) return 'unchanged';
  return 'updated';
}

/**
 * Format value for display in tooltips and cells
 */
export function formatDisplayValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '(empty)';
  }
  
  const str = String(value);
  if (str.length > 100) {
    return str.substring(0, 97) + '...';
  }
  return str;
}

/**
 * Compare a single CSV row with its existing database record
 */
export function compareRecords(
  csvRow: Record<string, any>,
  dbRow: Record<string, any> | null,
  columnMappings: Map<string, string>
): Record<string, CellChange> {
  const cellChanges: Record<string, CellChange> = {};

  if (!dbRow) {
    // All fields are "added" if no existing record
    for (const [csvCol, dbCol] of columnMappings.entries()) {
      const newValue = csvRow[csvCol];
      cellChanges[csvCol] = {
        oldValue: null,
        newValue,
        changeType: 'added',
        displayOld: '(empty)',
        displayNew: formatDisplayValue(newValue)
      };
    }
    return cellChanges;
  }

  // Compare each field
  for (const [csvCol, dbCol] of columnMappings.entries()) {
    const newValue = csvRow[csvCol];
    const oldValue = dbRow[dbCol];
    const changeType = getChangeType(oldValue, newValue);

    cellChanges[csvCol] = {
      oldValue,
      newValue,
      changeType,
      displayOld: formatDisplayValue(oldValue),
      displayNew: formatDisplayValue(newValue)
    };
  }

  return cellChanges;
}

/**
 * Generate diff for all rows in update mode
 */
export function generateRowChanges(
  csvData: any[],
  dbRecords: Record<string, any>,
  columnMappings: Map<string, string>,
  idField: string = 'id'
): RowChanges[] {
  return csvData.map((csvRow, index) => {
    const recordId = csvRow[idField];
    const dbRow = dbRecords[recordId] || null;
    const cellChanges = compareRecords(csvRow, dbRow, columnMappings);
    
    // Check if row has any changes
    const hasChanges = Object.values(cellChanges).some(
      change => change.changeType !== 'unchanged'
    );

    return {
      rowIndex: index,
      recordId,
      hasChanges,
      cellChanges
    };
  });
}
