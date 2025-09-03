export function jsonToCsv(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle null/undefined values
      if (value == null) return '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

export function downloadFile(content: string, filename: string, contentType: string = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function normalizeAgentResponse(data: any): { columns: string[]; rows: any[] } {
  if (!data) return { columns: [], rows: [] };
  
  // Handle array of objects (most common case)
  if (Array.isArray(data)) {
    const cols = data.length ? Object.keys(data[0]) : [];
    return { columns: cols, rows: data };
  }
  
  // Handle {ok: true, columns: [...], rows: [...]} format
  if (data.ok && Array.isArray(data.rows) && Array.isArray(data.columns)) {
    return { columns: data.columns, rows: data.rows };
  }
  
  // Handle {columns: [...], rows: [...]} format
  if (Array.isArray(data.rows) && Array.isArray(data.columns)) {
    return { columns: data.columns, rows: data.rows };
  }
  
  // Fallback: try to interpret unknown object shapes
  const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : []);
  const cols = rows.length ? Object.keys(rows[0]) : (Array.isArray(data?.columns) ? data.columns : []);
  return { columns: cols, rows };
}

export function parseAgentResponse(response: any): { data: Record<string, any>[], error?: string } {
  try {
    const normalized = normalizeAgentResponse(response);
    return { data: normalized.rows };
  } catch (error) {
    return { data: [], error: 'Failed to parse response' };
  }
}

export function formatNumber(value: any): string {
  if (value == null) return '—';
  
  // Check if it's a number or numeric string
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  
  if (!isNaN(numValue) && isFinite(numValue)) {
    return numValue.toLocaleString();
  }
  
  return String(value);
}