import React, { useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: T) => React.ReactNode;
    className?: string;
    headerClassName?: string;
    width?: number;
    sticky?: boolean;
  }>;
  containerHeight: number;
  rowHeight?: number;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  loading?: boolean;
  stickyFirstColumn?: boolean;
  className?: string;
}

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  containerHeight,
  rowHeight = 52,
  onRowClick,
  onRowDoubleClick,
  loading = false,
  stickyFirstColumn = true,
  className
}: VirtualizedTableProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();

  if (loading) {
    return (
      <div 
        className={cn("border rounded-lg overflow-hidden", className)}
        style={{ height: containerHeight }}
      >
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-table-header border-b">
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    "table-cell-compact bg-table-header",
                    column.headerClassName,
                    column.sticky && stickyFirstColumn && "sticky left-0 z-30 bg-table-header"
                  )}
                  style={{ width: column.width }}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        <div className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              {columns.map((column) => (
                <Skeleton key={column.key} className="h-8 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className={cn(
        "overflow-auto border rounded-lg bg-background",
        "scrollbar-visible [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:h-3",
        "[&::-webkit-scrollbar-track]:bg-muted/50 [&::-webkit-scrollbar-track]:rounded",
        "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded",
        "[&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50",
        className
      )}
      style={{ height: containerHeight }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-table-header border-b-2">
            <TableRow className="hover:bg-table-header">
              {columns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className={cn(
                      "table-cell-compact bg-table-header min-h-12 max-h-[4.5rem] overflow-hidden align-middle",
                      "text-white font-semibold border-r border-border/50 last:border-r-0",
                      column.headerClassName,
                      column.sticky && stickyFirstColumn && "sticky left-0 z-30 bg-table-header shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                    )}
                    style={{ width: column.width }}
                  >
                    <span className="text-wrap break-words leading-tight line-clamp-3 text-white">{column.label}</span>
                  </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {virtualRows.map((virtualRow) => {
              const row = data[virtualRow.index];
              const isEven = virtualRow.index % 2 === 0;
              
              return (
                <TableRow
                  key={virtualRow.index}
                  className={cn(
                    "cursor-pointer hover:bg-table-row-hover transition-colors border-b border-border/30",
                    isEven ? "bg-background" : "bg-table-row-even",
                    onRowClick && "hover:bg-table-row-hover"
                  )}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => onRowClick?.(row)}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                >
                  {columns.map((column) => {
                    const value = row[column.key];
                    const content = column.render ? column.render(value, row) : value?.toString() || '';
                    
                    return (
                      <TableCell 
                        key={column.key}
                        className={cn(
                          "table-cell-compact text-fluid-base max-h-[4.5rem] overflow-hidden align-middle",
                          "border-r border-border/30 last:border-r-0",
                          column.className,
                          column.sticky && stickyFirstColumn && "sticky left-0 z-10 bg-inherit shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                        )}
                        style={{ width: column.width }}
                      >
                        <div className="text-wrap break-words leading-tight line-clamp-3">
                          {content}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}