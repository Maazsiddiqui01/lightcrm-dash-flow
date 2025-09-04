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
  const tableRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  // Pagination logic
  const totalPages = Math.ceil((data?.length || 0) / pageSize);
  const paginatedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);


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
    const rows = data.map(row => 
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
    <div className={cn("space-y-6", className)}>
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center space-x-4 flex-1">
          {onSearchChange && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
              />
            </div>
          )}
          {filters}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={exportToCSV} 
            className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
              >
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border/50 shadow-xl">
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
            <SelectTrigger className="w-20 border-border/50 focus:border-primary/50 focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border/50 shadow-xl">
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 text-sm bg-primary-light/50 p-3 rounded-lg border border-primary/20">
          <span className="text-muted-foreground font-medium">Active Filters:</span>
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              {filter.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-primary/70 hover:text-primary"
                onClick={filter.onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {onClearAllFilters && (
            <Button variant="link" size="sm" onClick={onClearAllFilters} className="text-primary hover:text-primary-hover">
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
        <Card className="overflow-hidden border-0 shadow-lg shadow-primary/5">
          {data.length === 0 ? (
            <CardContent className="py-16 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{emptyState?.title || "No data found"}</h3>
                <p className="text-muted-foreground">{emptyState?.description || "There are no items to display."}</p>
                {emptyState?.action}
              </div>
            </CardContent>
          ) : (
            <div className="table-wrapper">
              {/* STICKY TOP SCROLLBAR for easy horizontal navigation */}
              <div
                ref={topScrollRef}
                className="sticky top-0 z-10 overflow-x-auto h-5 bg-card border-y border-border shadow-sm scrollbar-thin scrollbar-thumb-primary/40 scrollbar-track-muted/20 hover:scrollbar-thumb-primary/60 transition-colors"
                onScroll={(e) => {
                  if (tableRef.current) {
                    tableRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                }}
              >
                <div style={{ width: tableRef.current?.scrollWidth ?? '200%', height: '20px' }} />
              </div>

              <div 
                ref={tableRef}
                className="overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                onScroll={(e) => {
                  if (topScrollRef.current) {
                    topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                  if (bottomScrollRef.current) {
                    bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                }}
              >
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-table-header backdrop-blur border-b border-border/50">
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      {visibleColumns.map((column, index) => (
                        <TableHead
                          key={column.key}
                          className={cn(
                            "h-12 relative font-semibold text-foreground",
                            column.sticky && "sticky left-0 z-10 bg-table-header",
                            column.headerClassName,
                            column.sortable && "cursor-pointer select-none hover:bg-table-row-hover/50 transition-colors"
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
                            <span className="font-semibold text-sm">{column.label}</span>
                            {column.sortable && (
                              <div className="ml-2">
                                {sortKey === column.key ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp className="h-3 w-3 text-primary" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3 text-primary" />
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
                    {paginatedData.map((row, rowIndex) => (
                      <TableRow
                        key={row.id || rowIndex}
                        className={cn(
                          "h-12 hover:bg-table-row-hover cursor-pointer transition-all duration-200 border-b border-border/30",
                          rowIndex % 2 === 0 ? "bg-card" : "bg-table-row-even",
                          onRowClick && "focus:bg-table-row-hover focus:outline-none focus:ring-1 focus:ring-primary/50"
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
                              "py-3 px-4 text-sm",
                              column.sticky && "sticky left-0 z-10 bg-inherit",
                              column.className
                            )}
                            style={{ 
                              width: columnWidths[column.key] || column.width,
                              minWidth: column.minWidth || 80
                            }}
                          >
                            {column.render ? column.render(row[column.key], row) : (
                              <span className="truncate block text-foreground">{row[column.key]}</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* BOTTOM SCROLLBAR (mirror) */}
              <div
                ref={bottomScrollRef}
                className="overflow-x-auto h-4 border-t"
                onScroll={(e) => {
                  if (tableRef.current) {
                    tableRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                }}
              >
                <div style={{ width: tableRef.current?.scrollWidth ?? '200%', height: '1px' }} />
              </div>
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
                className="mobile-card cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
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