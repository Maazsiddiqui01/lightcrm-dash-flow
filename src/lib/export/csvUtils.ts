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
 * Download CSV file
 */
export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
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