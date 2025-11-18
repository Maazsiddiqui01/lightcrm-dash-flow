import { toast } from 'sonner';
import { buildCsv, downloadCsv, downloadExcel, generateExportFilename, generateExcelFilename, safeCell } from './csvUtils';
import { collectFilteredIds, fetchRowsByIds, getAllRawColumns } from './dataFetcher';
import { createMultiSortComparator } from '../sort/customSort';
import { READ_ONLY_OPPORTUNITY_COLUMNS } from '@/utils/opportunityColumnMapping';

export interface ExportOptions {
  page: 'contacts' | 'opportunities';
  mode: 'current' | 'detailed';
  format?: 'csv' | 'excel';
  selectedIds?: string[];
  filters?: any;
  sortLevels?: any[];
  visibleColumns?: string[];
  columnHeaders?: Record<string, string>;
}

/**
 * Main export service function
 */
export async function exportCsv(options: ExportOptions): Promise<void> {
  try {
    toast.loading('Preparing CSV...');

    // 1) Determine columns
    const { columns, headers } = getColumnsAndHeaders(options);

    // 2) Determine row set: selected vs full filtered
    let ids: string[];
    if (options.selectedIds && options.selectedIds.length > 0) {
      ids = options.selectedIds;
    } else {
      ids = await collectFilteredIds({
        page: options.page,
        filters: options.filters,
        sortLevels: options.sortLevels
      });
      
      if (ids.length === 0) {
        toast.error('No rows to export');
        return;
      }
    }

    // 3) Fetch rows for those IDs with needed columns
    const rows = await fetchRowsByIds({
      page: options.page,
      ids,
      columns
    });

    if (rows.length === 0) {
      toast.error('No rows to export');
      return;
    }

    // 4) Apply client-side custom sort refinement if needed
    const sortedRows = applySortRefinement(rows, options.sortLevels);

    // 5) Build data rows
    const data = sortedRows.map(row =>
      columns.map(col => safeCell(row[col]))
    );

    // 6) Export in requested format
    const format = options.format || 'csv';
    
    if (format === 'excel') {
      const filename = generateExcelFilename(
        `${options.page === 'contacts' ? 'contacts' : 'opportunities'}-${options.mode}`
      );
      downloadExcel(filename, headers, data);
    } else {
      const csv = buildCsv(headers, data);
      const filename = generateFilename(options);
      downloadCsv(filename, csv);
    }

    toast.success(`Exported ${rows.length} rows`);
  } catch (error: any) {
    console.error('Export failed:', error);
    toast.error(`Failed to export CSV: ${error.message ?? 'Unknown error'}`);
  } finally {
    toast.dismiss();
  }
}

/**
 * Determine columns and headers for export
 * Always exports all database columns regardless of UI visibility
 */
function getColumnsAndHeaders(options: ExportOptions): { columns: string[]; headers: string[] } {
  // Always export all database columns, excluding UI-only and system columns
  // getAllRawColumns already filters out: actions, created_at, updated_at, 
  // locked_by, locked_until, lock_reason, organization_id
  const columns = getAllRawColumns(options.page);
  
  return { columns, headers: columns };
}

/**
 * Apply client-side custom sort refinement
 */
function applySortRefinement(rows: any[], sortLevels?: any[]): any[] {
  if (!sortLevels || sortLevels.length === 0) {
    return rows;
  }

  // Check if any sort level has custom ordering
  const hasCustomSort = sortLevels.some(level => level.custom && level.custom.length > 0);
  
  if (!hasCustomSort) {
    return rows;
  }

  // Apply custom sort comparator
  return [...rows].sort(createMultiSortComparator(sortLevels));
}

/**
 * Generate filename for export
 */
function generateFilename(options: ExportOptions): string {
  const prefix = `${options.page === 'contacts' ? 'contacts' : 'opportunities'}-${options.mode}`;
  return generateExportFilename(prefix);
}