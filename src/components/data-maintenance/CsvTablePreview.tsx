import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VirtualizedTable } from "@/components/shared/VirtualizedTable";
import { Upload, X, Table as TableIcon, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import type { ValidationResults } from "@/hooks/useCsvImport";
import { useMemo, useState } from "react";
import { generateRowChanges } from "@/utils/csvDiffEngine";
import type { RowChanges } from "@/utils/csvDiffEngine";
import { cn } from "@/lib/utils";

interface CsvTablePreviewProps {
  parsedData: any[];
  validationResults: ValidationResults;
  columnMappings: Map<string, string>;
  entityType: 'contacts' | 'opportunities';
  importMode: 'add-new' | 'update-existing';
  dbRecordsCache?: Map<string, any>;
  onImport: () => void;
  onCancel: () => void;
  containerHeight?: number;
}

export function CsvTablePreview({
  parsedData,
  validationResults,
  columnMappings,
  entityType,
  importMode,
  dbRecordsCache,
  onImport,
  onCancel,
  containerHeight = 600
}: CsvTablePreviewProps) {
  const { valid, invalid, warnings } = validationResults;
  const [viewFilter, setViewFilter] = useState<'all' | 'changes' | 'issues'>('all');
  const [columnFilter, setColumnFilter] = useState<'all' | 'changed'>('all');

  // Generate cell-level changes for update mode
  const rowChangesMap = useMemo<Map<number, RowChanges>>(() => {
    if (importMode !== 'update-existing' || !dbRecordsCache || dbRecordsCache.size === 0) {
      return new Map();
    }

    const dbRecordsObj = Object.fromEntries(dbRecordsCache);
    const rowChanges = generateRowChanges(parsedData, dbRecordsObj, columnMappings, 'id');
    
    return new Map(rowChanges.map(rc => [rc.rowIndex, rc]));
  }, [parsedData, dbRecordsCache, columnMappings, importMode]);

  // Map row index to validation status
  const rowStatusMap = useMemo(() => {
    const statusMap = new Map<number, { status: 'valid' | 'warning' | 'invalid', messages: string[] }>();
    
    // Mark invalid rows
    invalid.forEach(item => {
      const existingStatus = statusMap.get(item.row - 1) || { status: 'invalid', messages: [] };
      existingStatus.messages.push(`${item.field}: ${item.message}`);
      statusMap.set(item.row - 1, existingStatus);
    });
    
    // Mark warning rows
    warnings.forEach(item => {
      const existingStatus = statusMap.get(item.row - 1);
      if (!existingStatus || existingStatus.status !== 'invalid') {
        const messages = existingStatus?.messages || [];
        messages.push(item.message);
        statusMap.set(item.row - 1, { status: 'warning', messages });
      }
    });
    
    // Mark valid rows
    parsedData.forEach((_, index) => {
      if (!statusMap.has(index)) {
        statusMap.set(index, { status: 'valid', messages: [] });
      }
    });
    
    return statusMap;
  }, [parsedData, invalid, warnings]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    let filtered = parsedData.map((row, index) => ({
      ...row,
      __rowNumber: index + 1,
      __originalIndex: index
    }));

    // Apply row filter
    if (viewFilter === 'changes' && importMode === 'update-existing') {
      filtered = filtered.filter(row => {
        const rowChanges = rowChangesMap.get(row.__originalIndex);
        return rowChanges?.hasChanges;
      });
    } else if (viewFilter === 'issues') {
      filtered = filtered.filter(row => {
        const status = rowStatusMap.get(row.__originalIndex);
        return status?.status === 'invalid' || status?.status === 'warning';
      });
    }

    return filtered;
  }, [parsedData, viewFilter, importMode, rowChangesMap, rowStatusMap]);

  const columns = useMemo(() => {
    if (parsedData.length === 0) return [];
    
    const allKeys = new Set<string>();
    parsedData.forEach(row => {
      Object.keys(row).forEach(key => {
        if (key !== '__rowNumber' && key !== '__originalIndex') {
          allKeys.add(key);
        }
      });
    });

    let columnArray = Array.from(allKeys);
    
    // Apply column filter for update mode
    if (columnFilter === 'changed' && importMode === 'update-existing' && rowChangesMap.size > 0) {
      const changedColumns = new Set<string>();
      rowChangesMap.forEach(rowChange => {
        Object.entries(rowChange.cellChanges).forEach(([col, change]) => {
          if (change.changeType !== 'unchanged') {
            changedColumns.add(col);
          }
        });
      });
      columnArray = columnArray.filter(col => changedColumns.has(col) || col === 'id');
    }
    
    // Build columns for VirtualizedTable
    return [
      {
        key: '__status',
        label: '',
        width: 50,
        sticky: true,
        headerClassName: 'text-center bg-table-header',
        className: 'text-center bg-background',
        render: (_: any, row: any) => {
          const originalIndex = row.__originalIndex;
          const status = rowStatusMap.get(originalIndex);
          
          if (!status) return null;

          const StatusIcon = status.status === 'valid' ? CheckCircle2 
            : status.status === 'warning' ? AlertTriangle 
            : XCircle;
          
          const iconColor = status.status === 'valid' ? 'text-green-600' 
            : status.status === 'warning' ? 'text-yellow-600' 
            : 'text-destructive';

          if (status.messages.length === 0) {
            return (
              <div className="flex items-center justify-center">
                <StatusIcon className={cn("h-4 w-4", iconColor)} />
              </div>
            );
          }

          return (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="cursor-help flex items-center justify-center w-full">
                    <StatusIcon className={cn("h-4 w-4", iconColor)} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" side="right">
                  <div className="space-y-1">
                    {status.messages.map((msg, i) => (
                      <div key={i} className="text-xs">{msg}</div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
      },
      {
        key: '__rowNumber',
        label: '#',
        width: 60,
        sticky: true,
        className: 'font-mono text-muted-foreground text-xs text-center bg-background',
        headerClassName: 'font-mono text-xs text-center bg-table-header',
        render: (value: any) => <div className="text-center">{value}</div>
      },
      ...columnArray.map(key => ({
        key,
        label: columnMappings.get(key) || key,
        width: Math.max(150, Math.min(300, (columnMappings.get(key) || key).length * 10)),
        headerClassName: 'bg-table-header',
        render: (value: any, row: any) => {
          const originalIndex = row.__originalIndex;
          const rowChanges = rowChangesMap.get(originalIndex);
          const cellChange = rowChanges?.cellChanges[key];

          // Determine cell styling based on change type
          let cellClassName = '';
          let showTooltip = false;
          let tooltipContent = '';

          if (cellChange && importMode === 'update-existing') {
            showTooltip = cellChange.changeType !== 'unchanged';
            
            switch (cellChange.changeType) {
              case 'added':
                cellClassName = 'bg-green-50 dark:bg-green-950/30 border-l-2 border-l-green-500';
                tooltipContent = `Added: ${cellChange.displayNew}`;
                break;
              case 'updated':
                cellClassName = 'bg-yellow-50 dark:bg-yellow-950/30 border-l-2 border-l-yellow-500';
                tooltipContent = `Changed from: ${cellChange.displayOld}\nTo: ${cellChange.displayNew}`;
                break;
              case 'cleared':
                cellClassName = 'bg-red-50 dark:bg-red-950/30 border-l-2 border-l-red-500';
                tooltipContent = `Cleared (was: ${cellChange.displayOld})`;
                break;
            }
          }

          const cellContent = (
            <div className={cn("text-sm px-1 py-1 -mx-1 -my-1 rounded h-full flex items-center", cellClassName)}>
              {cellChange?.changeType === 'cleared' ? (
                <span className="line-through text-muted-foreground italic text-xs">
                  {cellChange.displayOld}
                </span>
              ) : value === null || value === undefined || value === '' ? (
                <span className="text-muted-foreground italic text-xs">empty</span>
              ) : (
                <span className="break-all">{String(value)}</span>
              )}
            </div>
          );

          if (showTooltip && tooltipContent) {
            return (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help w-full">
                      {cellContent}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs whitespace-pre-wrap" side="top">
                    {tooltipContent}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return cellContent;
        }
      }))
    ];
  }, [parsedData, columnMappings, rowChangesMap, importMode, rowStatusMap, columnFilter]);

  // Display first 50 rows initially
  const displayData = useMemo(() => filteredData.slice(0, 50), [filteredData]);

  const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
  const totalRows = parsedData.length;
  const filteredRows = filteredData.length;
  const displayedRows = displayData.length;
  
  // Calculate change statistics for update mode
  const changeStats = useMemo(() => {
    if (importMode !== 'update-existing') return null;
    
    let totalChanges = 0;
    let addedCount = 0;
    let clearedCount = 0;
    
    rowChangesMap.forEach(rowChange => {
      Object.values(rowChange.cellChanges).forEach(change => {
        if (change.changeType !== 'unchanged') {
          totalChanges++;
          if (change.changeType === 'added') addedCount++;
          if (change.changeType === 'cleared') clearedCount++;
        }
      });
    });
    
    return { totalChanges, addedCount, clearedCount };
  }, [rowChangesMap, importMode]);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <TableIcon className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {importMode === 'add-new' 
                ? `Ready to import ${valid.length} ${entityType === 'contacts' ? 'contact' : 'opportunit'}${valid.length !== 1 ? (entityType === 'contacts' ? 's' : 'ies') : 'y'}`
                : `Ready to update ${valid.length} ${entityType === 'contacts' ? 'contact' : 'opportunit'}${valid.length !== 1 ? (entityType === 'contacts' ? 's' : 'ies') : 'y'}`
              }
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {totalRows} total rows
              </Badge>
              <Badge variant="outline" className="text-xs">
                {columns.length - 2} columns
              </Badge>
              {changeStats && changeStats.totalChanges > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {changeStats.totalChanges} cell{changeStats.totalChanges !== 1 ? 's' : ''} changed
                </Badge>
              )}
              {invalid.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {invalid.length} row{invalid.length !== 1 ? 's' : ''} with errors
                </Badge>
              )}
              {warnings.length > 0 && (
                <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-700">
                  {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">View</label>
          <ToggleGroup type="single" value={viewFilter} onValueChange={(v) => v && setViewFilter(v as any)} size="sm">
            <ToggleGroupItem value="all" className="text-xs">
              All Rows ({totalRows})
            </ToggleGroupItem>
            {importMode === 'update-existing' && (
              <ToggleGroupItem value="changes" className="text-xs">
                Only Changes
              </ToggleGroupItem>
            )}
            <ToggleGroupItem value="issues" className="text-xs">
              Only Issues ({invalid.length + warnings.length})
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {importMode === 'update-existing' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Columns</label>
            <ToggleGroup type="single" value={columnFilter} onValueChange={(v) => v && setColumnFilter(v as any)} size="sm">
              <ToggleGroupItem value="all" className="text-xs">
                All Columns
              </ToggleGroupItem>
              <ToggleGroupItem value="changed" className="text-xs">
                Only Changed
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border-2 rounded-lg bg-background shadow-sm">
        <VirtualizedTable
          data={displayData}
          columns={columns}
          containerHeight={containerHeight}
          rowHeight={52}
          stickyFirstColumn={true}
          className="rounded-lg"
        />
      </div>

      {filteredRows > displayedRows && (
        <p className="text-sm text-muted-foreground text-center">
          Showing first {displayedRows} of {filteredRows} filtered rows{viewFilter !== 'all' || columnFilter !== 'all' ? ` (${totalRows} total)` : ''}. All valid rows will be {importMode === 'add-new' ? 'imported' : 'updated'}.
        </p>
      )}
      
      {filteredRows === 0 && totalRows > 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No rows match the current filter. Try selecting "All Rows" to see your data.
        </p>
      )}

      {/* Pre-Import Validation Warning */}
      {valid.length === 0 && (
        <Card className="border-destructive bg-destructive/10">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-destructive mb-1">
                  Cannot Import: All Rows Have Errors
                </h4>
                <p className="text-sm text-destructive/90 mb-2">
                  {invalid.length > 0 && (
                    <>🔴 <strong>{invalid.length} blocking error{invalid.length !== 1 ? 's' : ''}</strong> must be fixed before importing.</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fix the errors shown in red above, then re-upload your CSV file to try again.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {valid.length > 0 && invalid.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Partial Import Ready
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  ✅ <strong>{valid.length} row{valid.length !== 1 ? 's' : ''}</strong> will be {importMode === 'add-new' ? 'imported' : 'updated'}
                  <br />
                  ❌ <strong>{invalid.length} row{invalid.length !== 1 ? 's' : ''}</strong> will be skipped due to errors
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel} size="lg">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button 
                  onClick={onImport} 
                  disabled={valid.length === 0}
                  size="lg"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {valid.length === 0 
                    ? `Cannot ${importMode === 'add-new' ? 'Import' : 'Update'} - Fix Errors`
                    : `${importMode === 'add-new' ? 'Import' : 'Update'} ${valid.length} ${entityType === 'contacts' ? 'Contact' : 'Opportunit'}${valid.length !== 1 ? (entityType === 'contacts' ? 's' : 'ies') : 'y'}`
                  }
                  {invalid.length > 0 && valid.length > 0 && (
                    <Badge variant="outline" className="ml-1 bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 border-orange-300">
                      {invalid.length} skipped
                    </Badge>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {valid.length === 0 && (
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">
                  All {totalRows} rows have validation errors. Fix the errors shown above and re-upload your CSV to continue.
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
