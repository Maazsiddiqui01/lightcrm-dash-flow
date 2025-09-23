import React from 'react';
import { ColumnDef } from '@/components/shared/AdvancedTable';
import { TableColumn } from '@/lib/supabase/getTableColumns';
import { editableColumns, EditableFieldConfig, getNonEditableColumns, getHiddenByDefaultColumns } from '@/config/editableColumns';
import { format, isValid, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EditableCell } from '@/components/shared/EditableCell';
import { Badge } from '@/components/ui/badge';
import { formatDaysOverUnder, getDaysOverUnderColorClass } from '@/utils/contactCalculations';

export interface EditState {
  editMode: boolean;
  editingCell: { rowId: string; columnKey: string } | null;
  editedRows: Record<string, Record<string, any>>;
  cellErrors: Record<string, Record<string, string>>;
}

export interface EditHandlers {
  onStartEdit: (rowId: string, columnKey: string) => void;
  onCommitEdit: (rowId: string, columnKey: string, value: any) => void;
  onCancelEdit: () => void;
}

// Format cell value for display
export const formatCellValue = (value: any, column: TableColumn): string => {
  if (value === null || value === undefined) return '';
  
  if (column.type === 'timestamp with time zone') {
    try {
      const date = typeof value === 'string' ? parseISO(value) : new Date(value);
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy');
      }
    } catch {
      // If parsing fails, return the raw value
    }
  }
  
  if (column.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (column.type === 'computed') {
    return String(value);
  }
  
  return String(value);
};

// Get column visibility from localStorage with table-specific keys
export const getColumnVisibility = (storageKey: string): Record<string, boolean> => {
  try {
    const saved = localStorage.getItem(`column-visibility-${storageKey}`);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Save column visibility to localStorage with table-specific keys
export const saveColumnVisibility = (storageKey: string, visibility: Record<string, boolean>) => {
  try {
    localStorage.setItem(`column-visibility-${storageKey}`, JSON.stringify(visibility));
  } catch (error) {
    console.warn('Failed to save column visibility:', error);
  }
};

// Clear column visibility for a specific table
export const clearColumnVisibility = (storageKey: string) => {
  try {
    localStorage.removeItem(`column-visibility-${storageKey}`);
  } catch (error) {
    console.warn('Failed to clear column visibility:', error);
  }
};

// Create dynamic columns from table metadata
export function createDynamicColumns<T extends Record<string, any>>(
  tableColumns: TableColumn[],
  tableName: 'contacts_raw' | 'opportunities_raw',
  editState: EditState,
  editHandlers: EditHandlers,
  columnVisibility: Record<string, boolean> = {}
): ColumnDef<T>[] {
  const nonEditableColumns = getNonEditableColumns();
  const hiddenByDefaultColumns = getHiddenByDefaultColumns();
  const editableConfig = editableColumns[tableName];

  return tableColumns.map((tableColumn): ColumnDef<T> => {
    const isEditable = editState.editMode && 
                      !nonEditableColumns.includes(tableColumn.name) &&
                      tableColumn.name in editableConfig;

    // Check if column should be visible - hidden by default columns are false unless explicitly shown
    const isHiddenByDefault = hiddenByDefaultColumns.includes(tableColumn.name);
    const isVisible = isHiddenByDefault 
      ? columnVisibility[tableColumn.name] === true
      : columnVisibility[tableColumn.name] !== false;

    return {
      key: tableColumn.name,
      label: tableColumn.displayName,
      visible: isVisible,
      enableHiding: true, // Allow all columns to be hidden/shown by users
      resizable: true,
      width: getColumnWidth(tableColumn),
      render: (value: any, row: T) => {
        const rowId = String(row.id);
        const editedValue = editState.editedRows[rowId]?.[tableColumn.name] ?? value;
        const hasError = editState.cellErrors[rowId]?.[tableColumn.name];
        const isCurrentlyEditing = editState.editingCell?.rowId === rowId && 
                                 editState.editingCell?.columnKey === tableColumn.name;

        // If this column is editable and we're in edit mode
        if (isEditable) {
          const config: EditableFieldConfig = editableConfig[tableColumn.name];
          
          return (
            <EditableCell
              value={editedValue}
              config={config}
              onChange={(newValue: any) => {
                editHandlers.onCommitEdit(rowId, tableColumn.name, newValue);
              }}
              onCommit={() => editHandlers.onCancelEdit()}
              onCancel={() => editHandlers.onCancelEdit()}
              editing={isCurrentlyEditing}
              onStartEdit={() => editHandlers.onStartEdit(rowId, tableColumn.name)}
              error={hasError}
            />
          );
         }

        // Get display value and modification state first
        const displayValue = formatCellValue(editedValue, tableColumn);
        const isModified = editState.editedRows[rowId]?.[tableColumn.name] !== undefined;

        // Special handling for deal_name with URL linking
        if (tableColumn.name === 'deal_name' && displayValue && row.url) {
          return (
            <a 
              href={row.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors ${isModified ? 'font-medium' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {displayValue}
            </a>
          );
        }

        // Special handling for full_name with URL to online bio linking
        if (tableColumn.name === 'full_name' && displayValue && row.url_to_online_bio) {
          return (
            <a 
              href={row.url_to_online_bio} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors ${isModified ? 'font-medium' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {displayValue}
            </a>
          );
        }

        // Special handling for email_address with mailto link
        if (tableColumn.name === 'email_address' && displayValue) {
          return (
            <a 
              href={`mailto:${displayValue}`}
              className={`text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors ${isModified ? 'font-medium' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {displayValue}
            </a>
          );
        }

        // Special handling for days_over_under_max_lag with color coding
        if (tableColumn.name === 'days_over_under_max_lag') {
          const formattedValue = formatDaysOverUnder(editedValue);
          const colorClass = getDaysOverUnderColorClass(editedValue);
          return (
            <div className={`${colorClass} ${isModified ? 'font-medium' : ''}`}>
              {formattedValue}
            </div>
          );
        }


        if (tableColumn.type === 'boolean') {
          return (
            <Badge variant={editedValue ? "default" : "secondary"}>
              {editedValue ? '✓' : '—'}
            </Badge>
          );
        }

        // Special handling for summary columns (except summary_of_opportunity which should use tooltip)
        if (tableColumn.name.includes('summary') && tableColumn.name !== 'summary_of_opportunity' && displayValue.length > 50) {
          return (
            <div className={`text-wrap break-words leading-tight line-clamp-3 ${isModified ? 'font-medium text-primary' : ''}`}>
              {displayValue}
            </div>
          );
        }

        if (displayValue.length > 50) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`truncate ${isModified ? 'font-medium text-primary' : ''}`}>
                    {displayValue}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs whitespace-pre-wrap">{displayValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return (
          <div className={isModified ? 'font-medium text-primary' : ''}>
            {displayValue}
          </div>
        );
      },
    };
  });
}

// Get appropriate column width based on type and content
function getColumnWidth(column: TableColumn): number {
  if (column.name === 'id') return 100;
  if (column.type === 'boolean') return 80;
  if (column.type === 'timestamp with time zone') return 120;
  if (column.type.includes('integer') || column.type.includes('numeric')) return 100;
  if (column.name.includes('email')) return 200;
  if (column.name.includes('summary')) return 200; // Narrower width for summary columns
  if (column.name.includes('notes')) return 300;
  if (column.name.includes('name') || column.name.includes('title')) return 180;
  
  return 150;
}