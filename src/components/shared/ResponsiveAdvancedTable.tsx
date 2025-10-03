import React, { useState, useEffect, useMemo, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, 
  Download, 
  Settings, 
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  WrapText,
  GripVertical
} from "lucide-react";
import { ColumnPreferencesIndicator } from "./ColumnPreferencesIndicator";
import { cn } from "@/lib/utils";
import { getResponsiveColumns, getAdaptiveColumnWidth, getAdaptiveRowHeight } from "@/utils/columnManagement";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useTableLayout } from "@/hooks/useTableLayout";
import { VirtualizedTable } from "./VirtualizedTable";
import { TablePagination } from "./TablePagination";
import { useSelectedRows } from "@/hooks/useSelectedRows";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { useColumnResizing } from "@/hooks/useColumnResizing";

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
  enablePagination?: boolean;
  enableVirtualization?: boolean;
  rowHeight?: number;
  hideExportButton?: boolean;
  enableRowSelection?: boolean;
  onSelectedRowsChange?: (selectedRows: T[]) => void;
  selectedRowExportFn?: (selectedRows: T[]) => void;
  selectedRows?: string[];
  onSelectionChange?: (rows: string[]) => void;
  idKey?: string;
  showTopPagination?: boolean;
  hideColumnsButton?: boolean;
  editMode?: boolean; // Add edit mode prop
  enableResizing?: boolean;
  persistKey?: string;
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
  stickyFirstColumn = true,
  enablePagination = true,
  enableVirtualization = false,
  rowHeight = 52,
  hideExportButton = false,
  enableRowSelection = false,
  onSelectedRowsChange,
  selectedRowExportFn,
  selectedRows: externalSelectedRows,
  onSelectionChange: externalOnSelectionChange,
  idKey = 'id',
  showTopPagination = true,
  hideColumnsButton = false,
  editMode = false, // Add edit mode with default value
  enableResizing = false,
  persistKey = 'default',
}: ResponsiveAdvancedTableProps<T>) {
  const [columns, setColumns] = useState(initialColumns);
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  // Enhanced responsive layout system
  const responsiveLayout = useResponsiveLayout();
  
  // Column visibility persistence with table-specific storage
  const columnVisibilityHook = useColumnVisibility(`${tableType}-${tableId}`, initialColumns);
  
  // Row selection - use external control if provided, otherwise use internal
  const internalRowSelection = useSelectedRows({ 
    tableId, 
    data, 
    idKey 
  });
  
  const rowSelection = externalOnSelectionChange ? {
    selectedRowIds: externalSelectedRows || [],
    selectedCount: externalSelectedRows?.length || 0,
    selectRow: (rowId: string) => {
      if (!externalOnSelectionChange) return;
      externalOnSelectionChange([...(externalSelectedRows || []), rowId]);
    },
    deselectRow: (rowId: string) => {
      if (!externalOnSelectionChange || !externalSelectedRows) return;
      externalOnSelectionChange(externalSelectedRows.filter(id => id !== rowId));
    },
    toggleRow: (rowId: string) => {
      if (!externalSelectedRows || !externalOnSelectionChange) return;
      if (externalSelectedRows.includes(rowId)) {
        externalOnSelectionChange(externalSelectedRows.filter(id => id !== rowId));
      } else {
        externalOnSelectionChange([...externalSelectedRows, rowId]);
      }
    },
    selectAll: (pageData: any[]) => {
      if (!externalOnSelectionChange) return;
      const pageIds = pageData.map(row => String(row[idKey]));
      const allIds = new Set([...(externalSelectedRows || []), ...pageIds]);
      externalOnSelectionChange(Array.from(allIds));
    },
    deselectAll: (pageData?: any[]) => {
      if (!externalOnSelectionChange || !externalSelectedRows) return;
      if (pageData) {
        const pageIds = new Set(pageData.map(row => String(row[idKey])));
        externalOnSelectionChange(externalSelectedRows.filter(id => !pageIds.has(id)));
      } else {
        externalOnSelectionChange([]);
      }
    },
    toggleSelectAll: (pageData: any[]) => {
      if (!externalOnSelectionChange) return;
      const pageIds = pageData.map(row => String(row[idKey]));
      const allPageSelected = pageIds.every(id => externalSelectedRows?.includes(id));
      if (allPageSelected) {
        const pageIdsSet = new Set(pageIds);
        externalOnSelectionChange((externalSelectedRows || []).filter(id => !pageIdsSet.has(id)));
      } else {
        const allIds = new Set([...(externalSelectedRows || []), ...pageIds]);
        externalOnSelectionChange(Array.from(allIds));
      }
    },
    clearAll: () => externalOnSelectionChange?.([]),
    isRowSelected: (rowId: string) => externalSelectedRows?.includes(rowId) || false,
    isAllPageSelected: (pageData: any[]) => {
      if (pageData.length === 0) return false;
      return pageData.every(row => externalSelectedRows?.includes(String(row[idKey])));
    },
    isSomePageSelected: (pageData: any[]) => {
      return pageData.some(row => externalSelectedRows?.includes(String(row[idKey])));
    },
    getSelectedRows: () => data.filter(row => externalSelectedRows?.includes(String(row[idKey]))),
    getSelectedRowIds: () => externalSelectedRows || [],
  } : internalRowSelection;

  // Column resizing
  const resizing = useColumnResizing({
    persistKey,
    defaultWidths: initialColumns.reduce((acc, col) => {
      if (col.width) acc[col.key] = col.width;
      return acc;
    }, {} as Record<string, number>),
  });
  
  // Notify parent when selection changes (only for internal selection)
  useEffect(() => {
    if (onSelectedRowsChange && enableRowSelection && !externalOnSelectionChange) {
      onSelectedRowsChange(internalRowSelection.getSelectedRows());
    }
  }, [internalRowSelection.selectedCount, onSelectedRowsChange, enableRowSelection, externalOnSelectionChange]);
  
  // Use the table layout hook for dynamic height calculation
  const { availableHeight, containerRef: layoutContainerRef, maxTableHeight } = useTableLayout({
    headerHeight: 160, // Toolbar + header + extra space
    footerHeight: enablePagination ? 80 : 20,
    padding: 20
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Dual horizontal scrollbar sync refs
  const topScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const [spacerWidth, setSpacerWidth] = useState(1200);

  // Measure container width for responsive columns
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const measure = () => {
      setContainerWidth(container.clientWidth);
      // Also update the layout container ref
      layoutContainerRef(container);
    };
    
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, [layoutContainerRef]);

  // Update columns based on container width with enhanced responsive logic and user preferences
  useEffect(() => {
    if (containerWidth > 0) {
      // First apply responsive logic
      const responsiveColumns = getResponsiveColumns(initialColumns, containerWidth, tableType);
      
      // Then apply user visibility preferences
      const columnsWithUserPreferences = hideColumnsButton
        // When external ColumnsMenu is used, respect incoming visibility and do NOT override
        ? responsiveColumns
        // Otherwise, use internal persisted preferences
        : columnVisibilityHook.applyVisibilityToColumns(responsiveColumns);
      
      // Apply adaptive column widths for wide screens and resized widths
      const columnsWithAdaptiveWidths = columnsWithUserPreferences.map(col => {
        // If resizing is enabled and we have a custom width, use it
        if (enableResizing && resizing.columnWidths[col.key]) {
          return { ...col, width: resizing.columnWidths[col.key] };
        }
        
        // Otherwise use adaptive width for visible columns without explicit width
        if (col.visible && !col.width && !col.sticky) {
          const adaptiveWidth = getAdaptiveColumnWidth(
            containerWidth, 
            columnsWithUserPreferences.filter(c => c.visible).length
          );
          return { ...col, width: adaptiveWidth };
        }
        
        return col;
      });
      
      setColumns(columnsWithAdaptiveWidths);
    }
  }, [containerWidth, initialColumns, tableType, responsiveLayout.category, columnVisibilityHook.columnVisibility, hideColumnsButton, enableResizing, resizing.columnWidths]);

  // Sync horizontal scroll between top clone and table body (bottom native)
  useEffect(() => {
    const topEl = topScrollRef.current;
    const bodyEl = scrollRef.current;
    if (!topEl || !bodyEl) return;

    let rafId = 0;

    const syncFromTop = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const x = topEl.scrollLeft;
      rafId = requestAnimationFrame(() => {
        if (bodyEl) bodyEl.scrollLeft = x;
        isSyncingRef.current = false;
      });
    };

    const syncFromBody = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const x = bodyEl.scrollLeft;
      rafId = requestAnimationFrame(() => {
        if (topEl) topEl.scrollLeft = x;
        isSyncingRef.current = false;
      });
    };

    // Initial alignment
    topEl.scrollLeft = bodyEl.scrollLeft;

    topEl.addEventListener('scroll', syncFromTop, { passive: true });
    bodyEl.addEventListener('scroll', syncFromBody, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      topEl.removeEventListener('scroll', syncFromTop);
      bodyEl.removeEventListener('scroll', syncFromBody);
    };
  }, [loading, columns.length, data.length]);

  // Measure content width to size the top scrollbar spacer
  useEffect(() => {
    const bodyEl = scrollRef.current;
    if (!bodyEl) return;

    const measure = () => {
      const table = bodyEl.querySelector('table') as HTMLTableElement | null;
      const width = table ? table.scrollWidth : bodyEl.scrollWidth;
      setSpacerWidth(Math.max(width, bodyEl.clientWidth, 1200));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bodyEl);
    const table = bodyEl.querySelector('table');
    if (table) ro.observe(table);
    window.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [loading, columns.length, data.length, containerWidth]);


  // Calculate pagination if enabled
  const totalPages = enablePagination ? Math.ceil(data.length / pageSize) : 1;
  
  const displayData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    if (enablePagination) {
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      return data.slice(start, end);
    }
    
    return data;
  }, [data, currentPage, pageSize, enablePagination]);

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Add checkbox column if row selection is enabled and get visible columns
  const { columnsWithSelection, visibleColumns } = useMemo(() => {
    let workingColumns = columns;
    
    if (enableRowSelection) {
      const checkboxColumn: ColumnDef<T> = {
        key: 'select',
        label: '',
        width: 50,
        minWidth: 50,
        maxWidth: 50,
        sticky: true,
        enableHiding: false,
        render: (value, row) => (
          <Checkbox
            checked={rowSelection.isRowSelected(row[idKey])}
            onCheckedChange={() => rowSelection.toggleRow(row[idKey])}
          />
        )
      };
      
      workingColumns = [checkboxColumn, ...columns];
    }
    
    // Filter visible columns
    const visible = workingColumns.filter(col => col.visible !== false);
    
    return {
      columnsWithSelection: workingColumns,
      visibleColumns: visible
    };
  }, [enableRowSelection, columns, rowSelection, idKey]);

  // Handle column visibility toggle with persistence
  const toggleColumnVisibility = (columnKey: string, visible: boolean) => {
    // Update the hook's state (this will persist to localStorage)
    columnVisibilityHook.updateColumnVisibility(columnKey, visible);
    
    // Also update local columns state for immediate UI update
    setColumns(prev => prev.map(col => 
      col.key === columnKey && col.enableHiding !== false ? { ...col, visible } : col
    ));
  };

  // Handle sorting
  const handleSort = (key: string) => {
    if (!onSort) return;
    
    if (sortKey === key) {
      const newDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
      onSort(key, newDirection);
    } else {
      onSort(key, 'asc');
    }
  };

  // Export functionality
  const exportToCSV = () => {
    if (!data.length) return;

    // Filter out checkbox column from export
    const exportColumns = visibleColumns.filter(col => col.key !== 'select');

    const csvContent = [
      // Header row
      exportColumns.map(col => `"${col.label}"`).join(','),
      // Data rows
      ...data.map(row =>
        exportColumns.map(col => {
          const value = row[col.key];
          const stringValue = value?.toString() || '';
          return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFilename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export selected rows functionality
  const exportSelectedToCSV = () => {
    const selectedRows = rowSelection.getSelectedRows();
    if (selectedRowExportFn && selectedRows.length > 0) {
      selectedRowExportFn(selectedRows);
    } else if (selectedRows.length > 0) {
      // Default export behavior for selected rows
      const exportColumns = visibleColumns.filter(col => col.key !== 'select');
      
      const csvContent = [
        exportColumns.map(col => `"${col.label}"`).join(','),
        ...selectedRows.map(row =>
          exportColumns.map(col => {
            const value = row[col.key];
            const stringValue = value?.toString() || '';
            return `"${stringValue.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${exportFilename}-selected.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Render cell content with text wrapping and tooltip
  const renderCellContent = (column: ColumnDef<T>, row: T) => {
    const value = row[column.key];
    const content = column.render ? column.render(value, row) : value?.toString() || '';
    
    if (typeof content === 'string' && content.length > 50) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(
                "block leading-tight",
                resizing.textWrap ? "whitespace-normal break-words" : "truncate"
              )}>{content}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{content}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    if (typeof content === 'string') {
      return <span className={cn(
        "block leading-tight",
        resizing.textWrap ? "whitespace-normal break-words" : "truncate"
      )}>{content}</span>;
    }
    
    return content;
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number | string) => {
    // Handle "All" option with performance cap
    if (newPageSize === "All") {
      const effectiveSize = Math.min(data.length, 1000);
      setPageSize(effectiveSize);
      setCurrentPage(1);
      return;
    }
    
    const size = Number(newPageSize);
    setPageSize(size);
    setCurrentPage(1);
  };


  // Loading state
  if (loading) {
    return (
      <div ref={containerRef} className={cn("space-y-4", className)}>
        {/* Toolbar skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        {/* Table skeleton */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Use virtualized table for large datasets or when explicitly enabled
  if (enableVirtualization) {
    return (
      <div ref={containerRef} className={cn("space-y-4 flex flex-col", className)}>
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
            {/* Export Selected (only show when rows are selected) */}
            {enableRowSelection && rowSelection.selectedCount > 0 && (
              <Button variant="outline" size="sm" onClick={exportSelectedToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export Selected ({rowSelection.selectedCount})
              </Button>
            )}

            {/* Column visibility */}
            {!hideColumnsButton && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {columns.filter(column => column.enableHiding !== false).map((column) => (
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
            )}

            {/* Export */}
            {!hideExportButton && (
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
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

        {/* Virtualized Table */}
        <div className="flex-1 min-h-0">
          <VirtualizedTable
            data={displayData}
            columns={visibleColumns}
            containerHeight={Math.min(600, maxTableHeight)}
            rowHeight={rowHeight}
            onRowClick={onRowClick}
            loading={loading}
            stickyFirstColumn={stickyFirstColumn}
            className="flex-1"
          />
        </div>

        {/* Pagination */}
        {enablePagination && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={data.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            tableType={tableType}
          />
        )}
      </div>
    );
  }

  // Regular table implementation for smaller datasets
  return (
    <div ref={containerRef} className={cn("space-y-4 flex flex-col", className)}>
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search all data..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-12 pr-4 py-3 w-full sm:w-80 lg:w-96 text-base font-medium border-2 border-border/50 focus:border-primary shadow-lg bg-background/95 backdrop-blur-sm rounded-xl transition-all duration-200 hover:shadow-xl focus:shadow-xl"
              />
            </div>
          )}
          
          {filters && (
            <div className="flex items-center gap-2">
              {filters}
            </div>
          )}
        </div>
        
        {/* Column Preferences Indicator */}
        <div className="flex items-center gap-3">
          <ColumnPreferencesIndicator 
            visibleColumns={visibleColumns.length}
            totalColumns={columns.length}
            tableType={tableType}
          />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
            {/* Export Selected (only show when rows are selected) */}
            {enableRowSelection && rowSelection.selectedCount > 0 && (
              <Button variant="outline" size="sm" onClick={exportSelectedToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export Selected ({rowSelection.selectedCount})
              </Button>
            )}

            {/* Column visibility */}
            {!hideColumnsButton && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Quick Actions */}
                  <DropdownMenuItem 
                    onClick={() => columnVisibilityHook.showAllColumns(columns)}
                    className="text-sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Show All Columns
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => columnVisibilityHook.hideAllColumns(columns)}
                    className="text-sm"
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Non-Essential
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => columnVisibilityHook.resetToDefaults(columns)}
                    className="text-sm"
                  >
                    Reset to Defaults
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {/* Individual Columns */}
                  {columns.filter(column => column.enableHiding !== false).map((column) => (
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
            )}

            {/* Text Wrap Toggle */}
            {enableResizing && (
              <Button
                variant="outline"
                size="sm"
                onClick={resizing.toggleTextWrap}
                className="hidden sm:flex"
              >
                <WrapText className="h-4 w-4 mr-2" />
                {resizing.textWrap ? 'Unwrap' : 'Wrap Text'}
              </Button>
            )}

            {/* Export */}
            {!hideExportButton && (
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
        </div>
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

      {/* Top Pagination */}
      {enablePagination && showTopPagination && (
        <div className="border-b bg-muted/20 px-4 py-2">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={data.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            position="top"
            className="border-0 bg-transparent p-0"
            tableType={tableType}
          />
        </div>
      )}

      {/* Table Container with Dual Horizontal Scrollbars */}
      <div className="border rounded-lg bg-card">
        {/* TOP sticky scrollbar */}
        <div className="sticky top-0 z-30 bg-card border-b border-border">
          <div
            ref={topScrollRef}
            className="overflow-x-auto overflow-y-hidden h-4 scrollbar-visible"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div style={{ width: spacerWidth, height: 1 }} />
          </div>
        </div>

        {/* Main table with BOTTOM native scrollbar */}
        <div
          ref={scrollRef}
          className={cn(
            "overflow-x-auto",
            responsiveLayout.isUltraWide ? "max-h-[85vh]" : 
            responsiveLayout.isWideScreen ? "max-h-[80vh]" : "max-h-[70vh]"
          )}
        >
          <Table 
            className="w-full" 
            style={{ 
              minWidth: responsiveLayout.isWideScreen ? "100%" : "1200px",
              tableLayout: responsiveLayout.isWideScreen ? "fixed" : "auto"
            }}
          >
            <TableHeader className="sticky top-0 z-10 bg-table-header">
              <TableRow className="border-b bg-muted/20">
                 {visibleColumns.map((column, index) => (
                   <TableHead
                     key={column.key}
                     className={cn(
                       "table-cell-compact text-left align-middle font-calibri-light font-normal text-table-header-foreground select-none bg-table-header relative group border-r",
                       responsiveLayout.config.density === 'compact' && "px-2 py-1",
                       responsiveLayout.config.density === 'comfortable' && "px-6 py-4",
                       index === 0 && stickyFirstColumn && "sticky left-0 z-30 bg-table-header border-r border-table-header",
                       column.sortable && "cursor-pointer hover:text-table-header-foreground/80 transition-colors",
                       column.headerClassName,
                       resizing.textWrap ? "whitespace-normal" : "whitespace-nowrap"
                     )}
                     style={{
                       width: column.width,
                       minWidth: column.width,
                       maxWidth: column.width
                     }}
                     onClick={() => column.sortable && handleSort(column.key)}
                   >
                    {column.key === 'select' ? (
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={rowSelection.isAllPageSelected(displayData)}
                          onCheckedChange={() => rowSelection.toggleSelectAll(displayData)}
                          className={rowSelection.isSomePageSelected(displayData) && !rowSelection.isAllPageSelected(displayData) ? "data-[state=checked]:bg-primary/50" : ""}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-wrap break-words leading-tight line-clamp-3">{column.label}</span>
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
                    )}
                    
                     {/* Resize Handle */}
                     {enableResizing && column.resizable !== false && column.key !== 'select' && (
                       <div
                         className={cn(
                           "absolute right-0 top-0 h-full w-1 cursor-col-resize transition-all duration-200 flex items-center justify-center",
                           "hover:w-2 hover:bg-primary/30",
                           "after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-6 after:bg-border after:rounded-full",
                           "hover:after:bg-primary",
                           resizing.isResizing === column.key && "w-2 bg-primary/40"
                         )}
                         onMouseDown={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           resizing.handleResizeStart(column.key);
                           const startX = e.pageX;
                           const startWidth = column.width || 150;

                           // Add visual feedback
                           document.body.style.cursor = 'col-resize';
                           document.body.style.userSelect = 'none';

                           const handleMouseMove = (e: MouseEvent) => {
                             const newWidth = Math.max(80, Math.min(500, startWidth + (e.pageX - startX)));
                             
                             // Update column width immediately for real-time feedback
                             setColumns(prevColumns => 
                               prevColumns.map(col => 
                                 col.key === column.key 
                                   ? { ...col, width: newWidth }
                                   : col
                               )
                             );
                             
                             resizing.updateColumnWidth(column.key, newWidth);
                           };

                           const handleMouseUp = () => {
                             resizing.handleResizeEnd();
                             document.body.style.cursor = '';
                             document.body.style.userSelect = '';
                             document.removeEventListener('mousemove', handleMouseMove);
                             document.removeEventListener('mouseup', handleMouseUp);
                           };

                           document.addEventListener('mousemove', handleMouseMove);
                           document.addEventListener('mouseup', handleMouseUp);
                         }}
                       >
                         <GripVertical className={cn(
                           "h-3 w-3 transition-opacity duration-200",
                           "opacity-0 group-hover:opacity-60",
                           resizing.isResizing === column.key && "opacity-100"
                         )} />
                       </div>
                     )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.length === 0 ? (
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
                displayData.map((row, rowIndex) => {
                  const isEven = rowIndex % 2 === 0;
                  return (
                     <TableRow
                       key={rowIndex}
                       className={cn(
                         "transition-colors",
                         isEven ? "bg-background" : "bg-table-row-even",
                         onRowClick && !editMode && "cursor-pointer hover:bg-table-row-hover"
                       )}
                       onClick={(e) => {
                         // Don't trigger row click if clicking on checkbox
                         if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
                           e.stopPropagation();
                           return;
                         }
                         // Don't trigger row click if in edit mode
                         if (editMode) {
                           e.stopPropagation();
                           return;
                         }
                         onRowClick?.(row);
                       }}
                     >
                        {visibleColumns.map((column, cellIndex) => (
                          <TableCell
                            key={column.key}
                            className={cn(
                              "table-cell-compact align-middle text-fluid-base border-r",
                              cellIndex === 0 && stickyFirstColumn && "sticky left-0 z-10 bg-inherit border-r border-border",
                              column.className,
                              editMode && "cursor-default", // Change cursor in edit mode
                              resizing.textWrap ? "whitespace-normal py-3" : "whitespace-nowrap"
                            )}
                            style={{
                              width: column.width,
                              minWidth: column.width,
                              maxWidth: column.width
                            }}
                            onClick={(e) => {
                              // Prevent row click propagation when in edit mode
                              if (editMode) {
                                e.stopPropagation();
                              }
                            }}
                          >
                            <div className={cn(
                              resizing.textWrap ? "break-words" : "truncate"
                            )}>
                              {renderCellContent(column, row)}
                            </div>
                          </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Bottom Pagination */}
      {enablePagination && (
        <div className="border-t bg-muted/20 px-4 py-2">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={data.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            position="bottom"
            className="border-0 bg-transparent p-0"
            tableType={tableType}
          />
        </div>
      )}
    </div>
  );
}