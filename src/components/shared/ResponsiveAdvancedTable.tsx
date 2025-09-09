import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Download, 
  Settings, 
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getResponsiveColumns } from "@/utils/columnManagement";
import { useScrollSync } from "@/hooks/useScrollSync";

export interface ColumnDef<T = any> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sticky?: boolean;
  sortable?: boolean;
  resizable?: boolean;
  visible?: boolean;
  priority?: number;
  enableHiding?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TablePreset {
  name: string;
  columns: string[];
}

interface ResponsiveAdvancedTableProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onRowClick?: (row: T) => void;
  onSort?: (key: string, direction: 'asc' | 'desc' | null) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc' | null;
  filters?: React.ReactNode;
  activeFilters?: { label: string; onRemove: () => void }[];
  onClearAllFilters?: () => void;
  emptyState?: {
    title: string;
    description: string;
    action?: React.ReactNode;
  };
  tableId: string;
  presets?: TablePreset[];
  exportFilename?: string;
  className?: string;
  initialPageSize?: number;
  tableType?: 'contacts' | 'opportunities' | 'interactions' | 'tom';
  stickyFirstColumn?: boolean;
}

export function ResponsiveAdvancedTable<T extends Record<string, any>>({
  data,
  columns: initialColumns,
  loading = false,
  searchValue = "",
  onSearchChange,
  onRowClick,
  onSort,
  sortKey,
  sortDirection,
  filters,
  activeFilters = [],
  onClearAllFilters,
  emptyState,
  tableId,
  presets = [],
  exportFilename = "export",
  className,
  initialPageSize = 50,
  tableType = 'contacts',
  stickyFirstColumn = true
}: ResponsiveAdvancedTableProps<T>) {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState(initialColumns);
  const [containerWidth, setContainerWidth] = useState(0);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scrollbars
  useScrollSync(topScrollRef.current, mainScrollRef.current);

  // Update top scrollbar width to match main content
  useLayoutEffect(() => {
    const topScroll = topScrollRef.current;
    const mainScroll = mainScrollRef.current;
    
    if (!topScroll || !mainScroll) return;

    const updateTopScrollWidth = () => {
      const scrollWidth = mainScroll.scrollWidth;
      const clientWidth = mainScroll.clientWidth;
      
      if (scrollWidth > clientWidth) {
        topScroll.style.display = 'block';
        topScroll.firstElementChild && 
          ((topScroll.firstElementChild as HTMLElement).style.width = `${scrollWidth}px`);
      } else {
        topScroll.style.display = 'none';
      }
    };

    // Use ResizeObserver to track content changes
    const resizeObserver = new ResizeObserver(updateTopScrollWidth);
    resizeObserver.observe(mainScroll);

    // Initial sync
    updateTopScrollWidth();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Update pageSize when initialPageSize changes
  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  // Measure container width for responsive columns
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const measure = () => {
      setContainerWidth(container.clientWidth);
    };
    
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, []);

  // Update columns based on container width
  useEffect(() => {
    if (containerWidth > 0) {
      const responsiveColumns = getResponsiveColumns(initialColumns, containerWidth, tableType);
      setColumns(responsiveColumns);
    }
  }, [containerWidth, initialColumns, tableType]);

  // Pagination logic
  const totalPages = Math.ceil((data?.length || 0) / pageSize);
  const paginatedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  // Visible columns only
  const visibleColumns = useMemo(() => 
    columns.filter(col => col.visible !== false), 
    [columns]
  );

  // Handle column visibility toggle
  const toggleColumnVisibility = (columnKey: string, visible: boolean) => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey ? { ...col, visible } : col
    ));
  };

  // Handle sorting
  const handleSort = (key: string) => {
    if (!onSort) return;
    
    let newDirection: 'asc' | 'desc' | null = 'asc';
    if (sortKey === key) {
      if (sortDirection === 'asc') newDirection = 'desc';
      else if (sortDirection === 'desc') newDirection = null;
    }
    
    onSort(key, newDirection);
  };

  // Export CSV functionality
  const exportToCSV = () => {
    if (!data.length) return;
    
    const headers = visibleColumns.map(col => col.label);
    const rows = data.map(row => 
      visibleColumns.map(col => {
        const value = row[col.key];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      })
    );
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFilename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render cell content with tooltip for truncated text
  const renderCellContent = (column: ColumnDef<T>, row: T) => {
    const value = row[column.key];
    const rendered = column.render ? column.render(value, row) : value;
    
    if (typeof rendered === 'string' && rendered.length > 30) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate">{rendered}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{rendered}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return <span className="block truncate">{rendered}</span>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        {/* Table skeleton */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
          )}
          
          {filters && (
            <div className="flex items-center gap-2">
              {filters}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  className="capitalize"
                  checked={column.visible !== false}
                  onCheckedChange={(checked) => toggleColumnVisibility(column.key, checked)}
                  disabled={column.key === visibleColumns[0]?.key && stickyFirstColumn}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {filter.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={filter.onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {onClearAllFilters && (
            <Button variant="ghost" size="sm" onClick={onClearAllFilters}>
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Sticky top scrollbar */}
      <div 
        ref={topScrollRef}
        className="h-3 overflow-x-auto overflow-y-hidden sticky top-0 bg-card z-20 border-b border-border"
        style={{ display: 'none' }}
        aria-label="Horizontal scroll for table"
        data-scroll-sync="top"
      >
        <div className="h-px" />
      </div>

      {/* Table Container */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex-1 min-h-0">
        <div ref={mainScrollRef} className="overflow-auto max-h-[calc(100vh-24rem)]" id="table-scroll" style={{ minWidth: '100%' }}>
          <Table className="table-fixed min-w-[1200px]">
            <TableHeader>
              <TableRow className="border-b">
                {visibleColumns.map((column, index) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-12 px-4 text-left align-middle font-medium text-muted-foreground select-none",
                      index === 0 && stickyFirstColumn && "sticky left-0 z-10 bg-card after:absolute after:inset-y-0 after:-right-px after:w-px after:bg-border",
                      column.sortable && "cursor-pointer hover:text-foreground",
                      column.headerClassName
                    )}
                    style={{
                      width: index === 0 && stickyFirstColumn ? '200px' : 'auto',
                      minWidth: column.minWidth || (index === 0 ? '200px' : '120px'),
                      maxWidth: column.maxWidth
                    }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate">{column.label}</span>
                      {column.sortable && (
                        <div className="flex flex-col">
                          {sortKey === column.key ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : sortDirection === 'desc' ? (
                              <ArrowDown className="h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="h-32">
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                      <div className="text-muted-foreground">
                        {emptyState?.title || "No results found"}
                      </div>
                      {emptyState?.description && (
                        <div className="text-sm text-muted-foreground">
                          {emptyState.description}
                        </div>
                      )}
                      {emptyState?.action}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className={cn(
                      "border-b hover:bg-muted/50 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {visibleColumns.map((column, cellIndex) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "h-12 px-4 align-middle",
                          cellIndex === 0 && stickyFirstColumn && "sticky left-0 z-10 bg-card after:absolute after:inset-y-0 after:-right-px after:w-px after:bg-border",
                          column.className
                        )}
                        style={{
                          width: cellIndex === 0 && stickyFirstColumn ? '200px' : 'auto',
                          minWidth: column.minWidth || (cellIndex === 0 ? '200px' : '120px'),
                          maxWidth: column.maxWidth
                        }}
                      >
                        {renderCellContent(column, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}