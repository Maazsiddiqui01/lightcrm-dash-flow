import * as React from "react";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { GripVertical } from "lucide-react";

export type DataTableProps = {
  /** array of plain objects; schema can change between renders */
  rows: Record<string, unknown>[] | undefined;
  /** optional total for footer display */
  total?: number;
  /** current page metrics for footer text only (no fetching) */
  page?: number;
  pageSize?: number;
  /** optional: column order hint; others follow alphabetically */
  preferredOrder?: string[];
  /** optional: initial widths by column key */
  initialWidths?: Record<string, number>;
  /** optional: an id to persist UI prefs */
  persistKey?: string;
  className?: string;
};

interface ColumnConfig {
  key: string;
  width: number;
  visible: boolean;
}

const DataTable = ({
  rows,
  total,
  page = 1,
  pageSize = 25,
  preferredOrder = [],
  initialWidths = {},
  persistKey,
  className,
}: DataTableProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [resizingColumn, setResizingColumn] = React.useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = React.useState(false);

  // Infer columns from data
  const columns = React.useMemo(() => {
    if (!rows || rows.length === 0) return [];
    
    const allKeys = new Set<string>();
    rows.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    const keyArray = Array.from(allKeys);
    
    // Order columns: preferredOrder first, then alphabetically
    const orderedKeys = [
      ...preferredOrder.filter(key => keyArray.includes(key)),
      ...keyArray.filter(key => !preferredOrder.includes(key)).sort()
    ];

    return orderedKeys;
  }, [rows, preferredOrder]);

  // Column configurations with persistence
  const [columnConfigs, setColumnConfigs] = React.useState<Record<string, ColumnConfig>>(() => {
    if (persistKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`datatable-${persistKey}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Fall through to default
        }
      }
    }

    // Auto-fit widths based on content
    const configs: Record<string, ColumnConfig> = {};
    columns.forEach(key => {
      configs[key] = {
        key,
        width: initialWidths[key] || 150, // Default width
        visible: true,
      };
    });
    return configs;
  });

  // Auto-fit column widths on first render
  React.useEffect(() => {
    if (!rows || rows.length === 0 || Object.keys(columnConfigs).length === 0) return;

    const newConfigs = { ...columnConfigs };
    const sampleSize = Math.min(50, rows.length);
    
    columns.forEach(key => {
      if (initialWidths[key]) return; // Skip if width is explicitly set
      
      let maxLength = key.length; // Header length
      
      // Check first 50 rows for content length
      for (let i = 0; i < sampleSize; i++) {
        const value = formatCellValue(rows[i][key]);
        maxLength = Math.max(maxLength, value.length);
      }
      
      // Calculate width: ~8px per character + padding
      const calculatedWidth = Math.min(Math.max(maxLength * 8 + 32, 100), 300);
      
      if (!newConfigs[key]) {
        newConfigs[key] = {
          key,
          width: calculatedWidth,
          visible: true,
        };
      } else if (newConfigs[key].width === 150) { // Only update if still default
        newConfigs[key].width = calculatedWidth;
      }
    });

    setColumnConfigs(newConfigs);
  }, [rows, columns, initialWidths]);

  // Persist column configs
  React.useEffect(() => {
    if (persistKey && typeof window !== 'undefined') {
      localStorage.setItem(`datatable-${persistKey}`, JSON.stringify(columnConfigs));
    }
  }, [columnConfigs, persistKey]);

  // Synchronized horizontal scrolling
  React.useEffect(() => {
    const topScroll = topScrollRef.current;
    const bottomScroll = bottomScrollRef.current;
    const tableContainer = tableRef.current;

    if (!topScroll || !bottomScroll || !tableContainer) return;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      target.scrollLeft = source.scrollLeft;
    };

    const handleTopScroll = () => {
      if (bottomScrollRef.current && tableRef.current) {
        syncScroll(topScrollRef.current!, bottomScrollRef.current);
        syncScroll(topScrollRef.current!, tableRef.current);
      }
    };

    const handleBottomScroll = () => {
      if (topScrollRef.current && tableRef.current) {
        syncScroll(bottomScrollRef.current!, topScrollRef.current);
        syncScroll(bottomScrollRef.current!, tableRef.current);
      }
    };

    const handleTableScroll = () => {
      if (topScrollRef.current && bottomScrollRef.current) {
        syncScroll(tableRef.current!, topScrollRef.current);
        syncScroll(tableRef.current!, bottomScrollRef.current);
        setHasScrolled(tableRef.current!.scrollLeft > 0);
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    bottomScroll.addEventListener('scroll', handleBottomScroll);
    tableContainer.addEventListener('scroll', handleTableScroll);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      bottomScroll.removeEventListener('scroll', handleBottomScroll);
      tableContainer.removeEventListener('scroll', handleTableScroll);
    };
  }, []);

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    
    if (typeof value === "string") {
      // Check if it's an ISO datetime
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        try {
          return new Date(value).toLocaleString();
        } catch {
          return value;
        }
      }
      
      // Check if it's a numeric string
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num) && value.trim() === num.toString()) {
        return num.toLocaleString();
      }
      
      return value;
    }
    
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    
    return String(value);
  };

  const renderCellContent = (value: unknown, columnKey: string) => {
    const formattedValue = formatCellValue(value);
    const rawValue = String(value || "");
    
    // Check if it's an email
    if (typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return (
        <a href={`mailto:${value}`} className="text-primary hover:underline">
          {formattedValue}
        </a>
      );
    }

    const config = columnConfigs[columnKey];
    const isLongContent = formattedValue.length > 30;
    const shouldTruncate = config && config.width < 200 && isLongContent;

    if (shouldTruncate) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate" tabIndex={0}>
                {formattedValue}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="whitespace-pre-wrap break-words">
                {rawValue || formattedValue}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Handle ISO datetime with tooltip showing raw value
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{formattedValue}</span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {rawValue}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div className="whitespace-normal break-words">
        {formattedValue}
      </div>
    );
  };

  const handleColumnResize = (columnKey: string, delta: number) => {
    setColumnConfigs(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        width: Math.max(80, prev[columnKey].width + delta),
      },
    }));
  };

  // Handle keyboard resize
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (resizingColumn && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const delta = e.key === 'ArrowRight' ? 16 : -16;
        handleColumnResize(resizingColumn, delta);
        
        // Announce change for screen readers
        const announcement = `Column width ${e.key === 'ArrowRight' ? 'increased' : 'decreased'}`;
        const ariaLive = document.querySelector('[aria-live="polite"]');
        if (ariaLive) {
          ariaLive.textContent = announcement;
          setTimeout(() => ariaLive.textContent = '', 1000);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [resizingColumn]);

  // Loading skeleton
  if (rows === undefined) {
    return (
      <div className={cn("w-full", className)}>
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex space-x-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-6 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const visibleColumns = columns.filter(key => columnConfigs[key]?.visible !== false);
  const totalWidth = visibleColumns.reduce((sum, key) => sum + (columnConfigs[key]?.width || 150), 0);
  
  // Calculate pagination display
  const startItem = rows.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, rows.length);

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Accessibility announcements */}
      <div aria-live="polite" className="sr-only"></div>
      
      {/* Top horizontal scrollbar */}
      <div className="w-full overflow-x-auto border-b" ref={topScrollRef}>
        <div style={{ width: totalWidth, height: '1px' }}></div>
      </div>

      {/* Main table container */}
      <div 
        ref={tableRef}
        className="w-full overflow-x-auto max-h-[70vh] overflow-y-auto border rounded-md"
      >
        <Table className="relative">
          <TableHeader className={cn("sticky top-0 z-10 bg-table-header", hasScrolled && "shadow-sm")}>
            <TableRow>
              {visibleColumns.map((columnKey) => (
                <TableHead
                  key={columnKey}
                  className="relative border-r last:border-r-0 select-none"
                  style={{ 
                    width: columnConfigs[columnKey]?.width || 150,
                    minWidth: columnConfigs[columnKey]?.width || 150,
                    maxWidth: columnConfigs[columnKey]?.width || 150,
                  }}
                  tabIndex={0}
                  onFocus={() => setResizingColumn(columnKey)}
                  onBlur={() => setResizingColumn(null)}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">
                      {columnKey.replace(/_/g, ' ')}
                    </span>
                    <div 
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 group"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startWidth = columnConfigs[columnKey]?.width || 150;
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          const delta = e.clientX - startX;
                          handleColumnResize(columnKey, delta - (startWidth - (columnConfigs[columnKey]?.width || 150)));
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={index} className="hover:bg-table-row-hover/50">
                  {visibleColumns.map((columnKey) => (
                    <TableCell
                      key={columnKey}
                      className="border-r last:border-r-0"
                      style={{ 
                        width: columnConfigs[columnKey]?.width || 150,
                        minWidth: columnConfigs[columnKey]?.width || 150,
                        maxWidth: columnConfigs[columnKey]?.width || 150,
                      }}
                    >
                      {renderCellContent(row[columnKey], columnKey)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bottom horizontal scrollbar */}
      <div className="w-full overflow-x-auto border-t" ref={bottomScrollRef}>
        <div style={{ width: totalWidth, height: '1px' }}></div>
      </div>

      {/* Footer with pagination info */}
      {(total !== undefined || rows.length > 0) && (
        <div className="flex justify-between items-center text-sm text-muted-foreground px-1">
          <div>
            Showing {startItem}–{endItem} of {total !== undefined ? total.toLocaleString() : rows.length.toLocaleString()}
          </div>
          <div>
            {resizingColumn && (
              <span className="text-xs">
                Use Alt + ←/→ to resize "{resizingColumn.replace(/_/g, ' ')}" column
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { DataTable };