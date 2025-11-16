import { toast } from 'sonner';
import { buildCsv, downloadCsv, generateExportFilename, safeCell } from './csvUtils';
import { collectFilteredIds, fetchRowsByIds, getAllRawColumns } from './dataFetcher';
import { createMultiSortComparator } from '../sort/customSort';

export interface ExportOptions {
  page: 'contacts' | 'opportunities';
  mode: 'current' | 'detailed';
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

    // 5) Build CSV
    const data = sortedRows.map(row =>
      columns.map(col => safeCell(row[col]))
    );

    const csv = buildCsv(headers, data);
    const filename = generateFilename(options);
    downloadCsv(filename, csv);

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
 */
function getColumnsAndHeaders(options: ExportOptions): { columns: string[]; headers: string[] } {
  if (options.mode === 'detailed') {
    const columns = getAllRawColumns(options.page);
    return { columns, headers: columns };
  }

  // Current view mode - filter out UI-only columns like 'actions'
  const columns = (options.visibleColumns || []).filter(col => col !== 'actions');
  const headers = columns.map(col => options.columnHeaders?.[col] || col);
  
  return { columns, headers };
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