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

export function parseAgentResponse(response: any): { data: Record<string, any>[], error?: string } {
  try {
    // Handle different response formats from n8n
    if (response?.data) {
      return { data: Array.isArray(response.data) ? response.data : [response.data] };
    }
    
    if (Array.isArray(response)) {
      return { data: response };
    }
    
    if (response && typeof response === 'object') {
      return { data: [response] };
    }
    
    return { data: [], error: 'Invalid response format' };
  } catch (error) {
    return { data: [], error: 'Failed to parse response' };
  }
}