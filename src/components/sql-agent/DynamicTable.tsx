import { useMemo, useState, useEffect } from "react";
import { VirtualizedTable } from "./VirtualizedTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface DynamicTableProps {
  data: any[];
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function DynamicTable({ data, className = "" }: DynamicTableProps) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);

  // Infer columns from data with priority ordering
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const allKeys = new Set<string>();
    data.forEach(row => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach(key => allKeys.add(key));
      }
    });
    
    const keyArray = Array.from(allKeys);
    
    // Priority order for common columns
    const priorityColumns = ['full_name', 'email_address', 'interactions_count', 'most_recent_interaction'];
    const prioritized = priorityColumns.filter(col => keyArray.includes(col));
    const remaining = keyArray.filter(col => !priorityColumns.includes(col)).sort();
    
    return [...prioritized, ...remaining];
  }, [data]);

  // Type-aware value parsing for sorting
  const parseValue = (value: any) => {
    if (value == null) return { type: 'null', value: null, sortKey: '' };
    
    const stringValue = String(value).trim();
    
    // Check for ISO date
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    if (isoDateRegex.test(stringValue)) {
      const date = new Date(stringValue);
      if (!isNaN(date.getTime())) {
        return { type: 'date', value: date, sortKey: date.getTime() };
      }
    }
    
    // Check for number
    const numericValue = Number(stringValue);
    if (!isNaN(numericValue) && isFinite(numericValue)) {
      return { type: 'number', value: numericValue, sortKey: numericValue };
    }
    
    // Check for email
    if (stringValue.includes('@') && stringValue.includes('.')) {
      return { type: 'email', value: stringValue, sortKey: stringValue.toLowerCase() };
    }
    
    return { type: 'string', value: stringValue, sortKey: stringValue.toLowerCase() };
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortState.column || !sortState.direction) return data;
    
    return [...data].sort((a, b) => {
      const aValue = parseValue(a[sortState.column!]);
      const bValue = parseValue(b[sortState.column!]);
      
      // Handle null values
      if (aValue.type === 'null' && bValue.type === 'null') return 0;
      if (aValue.type === 'null') return sortState.direction === 'asc' ? 1 : -1;
      if (bValue.type === 'null') return sortState.direction === 'asc' ? -1 : 1;
      
      // Type-aware comparison
      let comparison = 0;
      if (aValue.sortKey < bValue.sortKey) comparison = -1;
      if (aValue.sortKey > bValue.sortKey) comparison = 1;
      
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortState]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Reset pagination when data changes
  useEffect(() => {
    setCurrentPage(0);
  }, [data, pageSize]);

  const handleSort = (column: string) => {
    setSortState(prev => {
      if (prev.column === column) {
        // Cycle through: asc -> desc -> null
        const nextDirection = prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc';
        return { column: nextDirection ? column : null, direction: nextDirection };
      } else {
        return { column, direction: 'asc' };
      }
    });
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;
    
    const csvContent = [
      columns.join(','),
      ...sortedData.map(row => 
        columns.map(col => {
          const value = row[col];
          if (value == null) return '';
          const stringValue = String(value);
          // Escape commas and quotes
          return stringValue.includes(',') || stringValue.includes('"') 
            ? `"${stringValue.replace(/"/g, '""')}"` 
            : stringValue;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `data-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (column: string) => {
    if (sortState.column !== column) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    if (sortState.direction === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortState.direction === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4 opacity-50" />;
  };

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try adjusting your query or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {sortedData.length.toLocaleString()} results
          </span>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Show:</span>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          className="flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Table with sortable headers */}
      <div className="relative">
        {/* Custom header for sorting */}
        <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 flex">
          {columns.map((column, index) => (
            <button
              key={column}
              onClick={() => handleSort(column)}
              className="flex-1 min-w-[120px] max-w-[300px] px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-between border-r border-gray-200 last:border-r-0"
              title={`Sort by ${column}`}
            >
              <span className="truncate">{column}</span>
              {getSortIcon(column)}
            </button>
          ))}
        </div>
        
        {/* Table content */}
        <VirtualizedTable 
          columns={columns} 
          rows={paginatedData}
          className="border-t-0"
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}