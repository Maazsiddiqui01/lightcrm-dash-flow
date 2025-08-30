import React, { useState, useEffect, useMemo, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp,
  ChevronDown,
  Search, 
  Download, 
  Settings, 
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

// Virtual scrolling hook for large datasets
const useVirtualized = (items: any[], itemHeight = 48, containerHeight = 600) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const virtualItems = items.slice(visibleStart, visibleEnd).map((item, index) => ({
    ...item,
    virtualIndex: visibleStart + index
  }));

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return {
    virtualItems,
    totalHeight,
    offsetY,
    setScrollTop,
    containerRef: setContainerRef
  };
};

export interface ColumnDef<T = any> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  sticky?: boolean;
  sortable?: boolean;
  resizable?: boolean;
  visible?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TablePreset {
  name: string;
  columns: string[];
}

interface AdvancedTableProps<T = any> {
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
  tableId: string; // For localStorage persistence
  presets?: TablePreset[];
  exportFilename?: string;
  className?: string;
}

export function AdvancedTable<T extends Record<string, any>>({
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
  className
}: AdvancedTableProps<T>) {
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState(initialColumns);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<{ key: string; startX: number; startWidth: number } | null>(null);
  const [shouldUseVirtualization, setShouldUseVirtualization] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Check if we should use virtualization
  useEffect(() => {
    setShouldUseVirtualization(data.length > 500);
  }, [data.length]);

  // Pagination logic
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  // Virtualization setup
  const { virtualItems, totalHeight, offsetY, setScrollTop } = useVirtualized(
    paginatedData, 
    48, 
    600
  );

  // Load persisted column state
  useEffect(() => {
    const savedState = localStorage.getItem(`table-${tableId}`);
    if (savedState) {
      try {
        const { columnWidths: savedWidths, visibleColumns } = JSON.parse(savedState);
        setColumnWidths(savedWidths || {});
        
        if (visibleColumns) {
          setColumns(prev => prev.map(col => ({
            ...col,
            visible: visibleColumns.includes(col.key)
          })));
        }
      } catch (e) {
        console.warn('Failed to load table state:', e);
      }
    }
  }, [tableId]);

  // Save column state
  const saveTableState = (newColumns: ColumnDef<T>[], newWidths: Record<string, number>) => {
    const state = {
      columnWidths: newWidths,
      visibleColumns: newColumns.filter(col => col.visible !== false).map(col => col.key)
    };
    localStorage.setItem(`table-${tableId}`, JSON.stringify(state));
  };

  // Handle column resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(resizing.startWidth + diff, 80);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizing.key]: newWidth
      }));
    };

    const handleMouseUp = () => {
      if (resizing) {
        saveTableState(columns, { ...columnWidths, [resizing.key]: columnWidths[resizing.key] });
        setResizing(null);
      }
    };

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, columns, columnWidths]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Column visibility toggle
  const toggleColumnVisibility = (columnKey: string) => {
    const newColumns = columns.map(col => 
      col.key === columnKey ? { ...col, visible: col.visible !== false ? false : true } : col
    );
    setColumns(newColumns);
    saveTableState(newColumns, columnWidths);
  };

  // Apply preset
  const applyPreset = (preset: TablePreset) => {
    const newColumns = columns.map(col => ({
      ...col,
      visible: preset.columns.includes(col.key)
    }));
    setColumns(newColumns);
    saveTableState(newColumns, columnWidths);
  };

  // Export CSV
  const exportToCSV = () => {
    const visibleColumns = columns.filter(col => col.visible !== false);
    const headers = visibleColumns.map(col => col.label);
    const rows = paginatedData.map(row => 
      visibleColumns.map(col => {
        const value = row[col.key];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      })
    );

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFilename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle sort
  const handleSort = (key: string) => {
    if (!onSort) return;
    
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortKey === key) {
      direction = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
    }
    onSort(key, direction);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, row: T, rowIndex: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick?.(row);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Card className="overflow-hidden">
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const visibleColumns = columns.filter(col => col.visible !== false);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4 flex-1">
          {onSearchChange && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 focus-ring"
              />
            </div>
          )}
          {filters}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportToCSV} className="focus-ring">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="focus-ring">
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {presets.length > 0 && (
                <>
                  {presets.map(preset => (
                    <DropdownMenuItem key={preset.name} onClick={() => applyPreset(preset)}>
                      {preset.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              {columns.map(column => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={column.visible !== false}
                  onCheckedChange={() => toggleColumnVisibility(column.key)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-20 focus-ring">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filters:</span>
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {filter.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={filter.onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {onClearAllFilters && (
            <Button variant="link" size="sm" onClick={onClearAllFilters}>
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Pagination (Top) */}
      {data.length > pageSize && (
        <div className="flex items-center justify-end space-x-2">
          <span className="text-sm text-muted-foreground">
            {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, data.length)} of {data.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="focus-ring"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="focus-ring"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Card className="overflow-hidden">
          {data.length === 0 ? (
            <CardContent className="py-16 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{emptyState?.title || "No data found"}</h3>
                <p className="text-muted-foreground">{emptyState?.description || "There are no items to display."}</p>
                {emptyState?.action}
              </div>
            </CardContent>
          ) : (
            <div 
              ref={tableRef}
              className="overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                <TableRow className="hover:bg-transparent">
                  {visibleColumns.map((column, index) => (
                    <TableHead
                      key={column.key}
                      className={cn(
                        "h-12 relative",
                        column.sticky && "sticky left-0 z-10 bg-background",
                        column.headerClassName,
                        column.sortable && "cursor-pointer select-none"
                      )}
                      style={{ 
                        width: columnWidths[column.key] || column.width,
                        minWidth: column.minWidth || 80
                      }}
                      onClick={column.sortable ? () => handleSort(column.key) : undefined}
                      aria-sort={
                        sortKey === column.key 
                          ? sortDirection === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{column.label}</span>
                        {column.sortable && (
                          <div className="ml-2">
                            {sortKey === column.key ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-50" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Resize handle */}
                      {column.resizable !== false && index < visibleColumns.length - 1 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 group"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setResizing({
                              key: column.key,
                              startX: e.clientX,
                              startWidth: columnWidths[column.key] || column.width || 150
                            });
                          }}
                        >
                          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shouldUseVirtualization ? (
                  // Virtualized rendering for large datasets
                  <>
                    <TableRow style={{ height: offsetY }}>
                      <TableCell colSpan={visibleColumns.length} className="p-0 border-0" />
                    </TableRow>
                    {virtualItems.map((row) => (
                      <TableRow
                        key={row.id || row.virtualIndex}
                        className={cn(
                          "h-12 hover:bg-muted/50 cursor-pointer transition-colors border-b",
                          row.virtualIndex % 2 === 1 && "bg-muted/20",
                          onRowClick && "focus:bg-muted/70 focus:outline-none"
                        )}
                        onClick={() => onRowClick?.(row)}
                        onKeyDown={(e) => handleKeyDown(e, row, row.virtualIndex)}
                        tabIndex={onRowClick ? 0 : -1}
                        role={onRowClick ? "button" : undefined}
                      >
                        {visibleColumns.map((column) => (
                          <TableCell
                            key={column.key}
                            className={cn(
                              "py-2 px-4",
                              column.sticky && "sticky left-0 z-10 bg-background",
                              column.className
                            )}
                            style={{ 
                              width: columnWidths[column.key] || column.width,
                              minWidth: column.minWidth || 80
                            }}
                          >
                            {column.render ? column.render(row[column.key], row) : (
                              <span className="truncate block">{row[column.key]}</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    <TableRow style={{ height: totalHeight - offsetY - (virtualItems.length * 48) }}>
                      <TableCell colSpan={visibleColumns.length} className="p-0 border-0" />
                    </TableRow>
                  </>
                ) : (
                  // Standard rendering for smaller datasets
                  paginatedData.map((row, rowIndex) => (
                    <TableRow
                      key={row.id || rowIndex}
                      className={cn(
                        "h-12 hover:bg-muted/50 cursor-pointer transition-colors border-b",
                        rowIndex % 2 === 1 && "bg-muted/20",
                        onRowClick && "focus:bg-muted/70 focus:outline-none"
                      )}
                      onClick={() => onRowClick?.(row)}
                      onKeyDown={(e) => handleKeyDown(e, row, rowIndex)}
                      tabIndex={onRowClick ? 0 : -1}
                      role={onRowClick ? "button" : undefined}
                    >
                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={cn(
                            "py-2 px-4",
                            column.sticky && "sticky left-0 z-10 bg-background",
                            column.className
                          )}
                          style={{ 
                            width: columnWidths[column.key] || column.width,
                            minWidth: column.minWidth || 80
                          }}
                        >
                          {column.render ? column.render(row[column.key], row) : (
                            <span className="truncate block">{row[column.key]}</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </Card>
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden">
        {data.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{emptyState?.title || "No data found"}</h3>
                <p className="text-muted-foreground">{emptyState?.description || "There are no items to display."}</p>
                {emptyState?.action}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="table-mobile-cards">
            {paginatedData.map((item, index) => (
              <div
                key={item.id || index}
                className="mobile-card cursor-pointer hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick?.(item);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${visibleColumns[0]?.render ? visibleColumns[0].render(item[visibleColumns[0].key], item) : item[visibleColumns[0].key]}`}
              >
                <div className="mobile-card-header">
                  <div>
                    <div className="mobile-card-title">
                      {visibleColumns[0]?.render ? visibleColumns[0].render(item[visibleColumns[0].key], item) : item[visibleColumns[0].key]}
                    </div>
                    {visibleColumns[1] && (
                      <div className="mobile-card-subtitle">
                        {visibleColumns[1]?.render ? visibleColumns[1].render(item[visibleColumns[1].key], item) : item[visibleColumns[1].key]}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
                <div className="mobile-card-content">
                  {visibleColumns.slice(2, 6).map((column) => (
                    <div key={column.key} className="mobile-field">
                      <span className="mobile-field-label">{column.label}:</span>
                      <span className="mobile-field-value">
                        {column.render ? column.render(item[column.key], item) : item[column.key] || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination (Bottom) */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, data.length)} of {data.length} results
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="focus-ring"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="focus-ring"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}