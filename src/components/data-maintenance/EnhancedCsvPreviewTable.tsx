import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, XCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useColumnResizing } from "@/hooks/useColumnResizing";

interface ColumnDef {
  key: string;
  label: string;
  width?: number;
  render?: (value: any, row: any, rowIndex: number) => React.ReactNode;
}

interface RowStatus {
  status: 'valid' | 'warning' | 'invalid';
  messages: string[];
  warnings?: string[];
}

interface EnhancedCsvPreviewTableProps {
  data: any[];
  columns: ColumnDef[];
  rowStatusMap: Map<number, RowStatus>;
  entityType: 'contacts' | 'opportunities';
  textWrap: boolean;
  onToggleTextWrap: () => void;
  highlightChanges?: boolean;
  changeMap?: Map<number, Set<string>>;
}

export function EnhancedCsvPreviewTable({
  data,
  columns,
  rowStatusMap,
  entityType,
  textWrap,
  onToggleTextWrap,
  highlightChanges = false,
  changeMap = new Map(),
}: EnhancedCsvPreviewTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const [spacerWidth, setSpacerWidth] = useState(1200);

  // Column resizing with persistence
  const resizing = useColumnResizing({
    persistKey: `csv-preview-${entityType}`,
    defaultWidths: columns.reduce((acc, col) => {
      if (col.width) acc[col.key] = col.width;
      return acc;
    }, {} as Record<string, number>),
  });

  // Sync horizontal scroll between top and bottom scrollbars
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

    topEl.scrollLeft = bodyEl.scrollLeft;
    topEl.addEventListener('scroll', syncFromTop, { passive: true });
    bodyEl.addEventListener('scroll', syncFromBody, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      topEl.removeEventListener('scroll', syncFromTop);
      bodyEl.removeEventListener('scroll', syncFromBody);
    };
  }, [columns.length, data.length]);

  // Measure content width for top scrollbar
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

    return () => ro.disconnect();
  }, [columns.length, data.length]);

  // Enhanced columns with status column and row number
  const enhancedColumns = useMemo(() => {
    const statusColumn: ColumnDef = {
      key: '__status',
      label: '',
      width: 50,
      render: (value, row, rowIndex) => {
        const status = rowStatusMap.get(rowIndex);
        if (!status) return null;

        const Icon = status.status === 'valid' ? CheckCircle2 :
                     status.status === 'warning' ? AlertTriangle : XCircle;
        const colorClass = status.status === 'valid' ? 'text-green-600' :
                          status.status === 'warning' ? 'text-yellow-600' : 'text-red-600';

        const tooltipContent = (
          <div className="space-y-2 max-w-md">
            <p className="font-semibold">
              {status.status === 'valid' && '✓ Valid Row'}
              {status.status === 'warning' && '⚠ Warning'}
              {status.status === 'invalid' && '✗ Invalid Row'}
            </p>
            {status.messages.length > 0 && (
              <div className="space-y-1">
                {status.messages.map((msg, idx) => (
                  <p key={idx} className="text-sm">{msg}</p>
                ))}
              </div>
            )}
            {status.warnings && status.warnings.length > 0 && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs font-semibold text-yellow-600">Warnings:</p>
                {status.warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">{warning}</p>
                ))}
              </div>
            )}
          </div>
        );

        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center cursor-help">
                  <Icon className={cn("h-4 w-4", colorClass)} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-md">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    };

    const rowNumberColumn: ColumnDef = {
      key: '__row',
      label: 'Row',
      width: 60,
      render: (value, row, rowIndex) => (
        <span className="text-muted-foreground font-mono text-xs">{rowIndex + 1}</span>
      ),
    };

    return [statusColumn, rowNumberColumn, ...columns];
  }, [columns, rowStatusMap]);

  // Handle column resize
  const handleMouseDown = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = resizing.columnWidths[columnKey] || 150;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = startWidth + diff;
      resizing.updateColumnWidth(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      resizing.handleResizeEnd();
    };

    resizing.handleResizeStart(columnKey);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="border-2 rounded-lg bg-background shadow-lg overflow-hidden h-full flex flex-col">
      {/* Scroll hint */}
      <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-100 flex items-center justify-center gap-2 flex-shrink-0">
        <AlertTriangle className="h-3 w-3" />
        <span>Scroll horizontally to see all columns</span>
      </div>

      {/* Top scrollbar */}
      <div 
        ref={topScrollRef}
        className="sticky top-0 z-30 overflow-x-auto h-3 scrollbar-visible bg-muted/20 flex-shrink-0"
        style={{ overflowY: 'hidden' }}
      >
        <div style={{ width: spacerWidth, height: 1 }} />
      </div>

      {/* Main table container */}
      <div 
        ref={scrollRef}
        className="overflow-auto scrollbar-visible flex-1"
        style={{ minHeight: '300px' }}
      >
        <Table className="w-full min-w-full">
          <TableHeader className="sticky top-0 z-20 bg-table-header">
            <TableRow className="hover:bg-table-header border-b-2 border-border">
              {enhancedColumns.map((column) => {
                const width = resizing.columnWidths[column.key] || column.width || 150;
                const isResizing = resizing.isResizing === column.key;

                return (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "relative px-4 py-3 text-left align-middle font-semibold text-white bg-table-header border-r border-border/50 last:border-r-0",
                      column.key === '__status' && "text-center",
                      isResizing && "select-none"
                    )}
                    style={{ width, minWidth: width }}
                  >
                    <div className={cn(
                      "flex items-center gap-2",
                      textWrap ? "whitespace-normal break-words" : "truncate"
                    )}>
                      {column.label}
                    </div>
                    
                    {/* Resize handle */}
                    {column.key !== '__status' && column.key !== '__row' && (
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/50 group"
                        onMouseDown={(e) => handleMouseDown(column.key, e)}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={enhancedColumns.length} className="text-center py-8 text-muted-foreground">
                  No data to display
                </TableCell>
              </TableRow>
            )}
            {data.map((row, rowIndex) => {
              const isEven = rowIndex % 2 === 0;
              const status = rowStatusMap.get(rowIndex);
              
              return (
                <TableRow
                  key={rowIndex}
                  className={cn(
                    "border-b border-border/30 transition-colors min-h-[44px]",
                    isEven ? "bg-background" : "bg-muted/20",
                    "hover:bg-table-row-hover"
                  )}
                >
                  {enhancedColumns.map((column) => {
                    const width = resizing.columnWidths[column.key] || column.width || 150;
                    const value = row[column.key];
                    const isChanged = highlightChanges && changeMap.get(rowIndex)?.has(column.key);
                    
                    let content;
                    if (column.render) {
                      content = column.render(value, row, rowIndex);
                    } else {
                      const displayValue = value?.toString() || '';
                      content = (
                        <TooltipProvider delayDuration={500}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                textWrap ? "whitespace-normal break-words" : "truncate"
                              )}>
                                {displayValue}
                              </div>
                            </TooltipTrigger>
                            {!textWrap && displayValue.length > 50 && (
                              <TooltipContent side="top" className="max-w-md">
                                <p className="text-sm whitespace-pre-wrap break-words">{displayValue}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "px-4 py-3 align-middle border-r border-border/30 last:border-r-0",
                          column.key === '__status' && "text-center",
                          isChanged && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                        style={{ width, minWidth: width }}
                      >
                        {content}
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
