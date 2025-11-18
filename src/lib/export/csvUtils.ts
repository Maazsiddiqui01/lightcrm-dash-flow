/**
 * Shared CSV export utilities
 */

/**
 * Build CSV content from headers and rows
 */
export function buildCsv(headers: string[], rows: any[][]): string {
  const csvRows = [headers, ...rows];
  return csvRows
    .map(row => row.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

/**
 * Download CSV file with UTF-8 BOM for Excel compatibility
 */
export function downloadCsv(filename: string, csvText: string): void {
  // Prepend UTF-8 BOM to force Excel to detect UTF-8 encoding
  const csvWithBom = '\ufeff' + csvText;
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Safe cell value - handles nulls and objects
 */
export function safeCell(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Generate export filename with current date
 */
export function generateExportFilename(prefix: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${prefix}-${today}.csv`;
}

/**
 * Download Excel file from headers and rows
 */
export function downloadExcel(filename: string, headers: string[], rows: any[][]): void {
  // Dynamic import to avoid loading xlsx unless needed
  import('xlsx').then((XLSX) => {
    // Create worksheet from array of arrays
    const wsData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto-size columns
    const maxWidths = headers.map((header, colIndex) => {
      const columnValues = rows.map(row => String(row[colIndex] || ''));
      const maxLength = Math.max(
        header.length,
        ...columnValues.map(v => v.length)
      );
      return Math.min(maxLength + 2, 50); // Cap at 50 characters
    });
    
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));
    
    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, filename);
  }).catch(error => {
    console.error('Failed to load xlsx library:', error);
    throw new Error('Excel export failed to load');
  });
}

/**
 * Generate Excel export filename with current date
 */
export function generateExcelFilename(prefix: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${prefix}-${today}.xlsx`;
}