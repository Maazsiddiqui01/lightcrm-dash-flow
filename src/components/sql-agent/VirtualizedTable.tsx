import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatNumber } from "@/utils/csvExport";

interface VirtualizedTableProps {
  columns: string[];
  rows: any[];
  className?: string;
}

export function VirtualizedTable({ columns, rows, className = "" }: VirtualizedTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate dynamic column widths based on content
  const columnWidths = useMemo(() => {
    return columns.map((column, index) => {
      // Get max content length for this column
      const headerLength = column.length;
      const maxContentLength = rows.reduce((max, row) => {
        const cellValue = String(row[column] ?? '');
        return Math.max(max, cellValue.length);
      }, 0);
      
      // Use the longer of header or content, with reasonable bounds
      const charWidth = 8; // approximate character width in pixels
      const padding = 32; // account for cell padding
      const calculatedWidth = Math.max(headerLength, maxContentLength) * charWidth + padding;
      
      // Apply min/max constraints
      return Math.min(Math.max(calculatedWidth, 120), 400);
    });
  }, [columns, rows]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => columnWidths[index] || 150,
    overscan: 2,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();

  const totalSize = rowVirtualizer.getTotalSize();
  const totalWidth = columnVirtualizer.getTotalSize();

  if (rows.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 text-gray-500 ${className}`}>
        No data to display
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`h-[600px] overflow-auto border border-gray-200 rounded-lg ${className}`}
    >
      <div
        style={{
          height: `${totalSize}px`,
          width: `${totalWidth}px`,
          position: 'relative',
        }}
      >
        {/* Sticky Header */}
        <div
          className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200"
          style={{
            height: '48px',
            width: `${totalWidth}px`,
          }}
        >
          {virtualColumns.map((virtualColumn) => (
            <div
              key={virtualColumn.key}
              className="absolute top-0 flex items-center px-4 font-semibold text-gray-900 border-r border-gray-200 last:border-r-0"
              style={{
                left: `${virtualColumn.start}px`,
                width: `${virtualColumn.size}px`,
                height: '48px',
              }}
            >
              <span className="truncate" title={columns[virtualColumn.index]}>
                {columns[virtualColumn.index]}
              </span>
            </div>
          ))}
        </div>

        {/* Virtual Rows */}
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          const isEven = virtualRow.index % 2 === 0;
          
          return (
            <div
              key={virtualRow.key}
              className={`absolute flex ${isEven ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}
              style={{
                top: `${virtualRow.start + 48}px`, // +48 for header height
                height: `${virtualRow.size}px`,
                width: `${totalWidth}px`,
              }}
            >
              {virtualColumns.map((virtualColumn) => {
                const columnKey = columns[virtualColumn.index];
                const cellValue = row[columnKey];
                
                return (
                  <div
                    key={`${virtualRow.key}-${virtualColumn.key}`}
                    className="flex items-center px-4 border-r border-gray-200 last:border-r-0 text-sm"
                    style={{
                      left: `${virtualColumn.start}px`,
                      width: `${virtualColumn.size}px`,
                      height: `${virtualRow.size}px`,
                      position: 'absolute',
                    }}
                  >
                    <div 
                      className="truncate" 
                      title={String(cellValue ?? '')}
                      onClick={() => {
                        if (cellValue != null) {
                          navigator.clipboard.writeText(String(cellValue));
                        }
                      }}
                    >
                      {formatNumber(cellValue)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}