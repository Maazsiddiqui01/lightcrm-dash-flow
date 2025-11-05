import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VirtualizedTable } from "@/components/shared/VirtualizedTable";
import { Upload, X, Table as TableIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ValidationResults } from "@/hooks/useCsvImport";
import { useMemo } from "react";
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

  // Generate cell-level changes for update mode
  const rowChangesMap = useMemo<Map<number, RowChanges>>(() => {
    if (importMode !== 'update-existing' || !dbRecordsCache || dbRecordsCache.size === 0) {
      return new Map();
    }

    const dbRecordsObj = Object.fromEntries(dbRecordsCache);
    const rowChanges = generateRowChanges(parsedData, dbRecordsObj, columnMappings, 'id');
    
    return new Map(rowChanges.map(rc => [rc.rowIndex, rc]));
  }, [parsedData, dbRecordsCache, columnMappings, importMode]);

  // Get all unique columns from parsed data and add row numbers
  const dataWithRowNumbers = useMemo(() => {
    return parsedData.map((row, index) => ({
      ...row,
      __rowNumber: index + 1
    }));
  }, [parsedData]);

  const columns = useMemo(() => {
    if (parsedData.length === 0) return [];
    
    const allKeys = new Set<string>();
    parsedData.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    const columnArray = Array.from(allKeys);
    
    // Build columns for VirtualizedTable
    return [
      {
        key: '__rowNumber',
        label: '#',
        width: 60,
        sticky: true,
        className: 'font-mono text-muted-foreground text-xs',
        headerClassName: 'font-mono text-xs',
        render: (value: any) => value
      },
      ...columnArray.map(key => ({
        key,
        label: columnMappings.get(key) || key,
        width: 150,
        render: (value: any, row: any) => {
          // Find row index in original data
          const rowIndex = parsedData.findIndex(r => r === row);
          const rowChanges = rowChangesMap.get(rowIndex);
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
            <div className={cn("text-sm px-2 py-1 -mx-2 -my-1 rounded", cellClassName)}>
              {cellChange?.changeType === 'cleared' ? (
                <span className="line-through text-muted-foreground italic text-xs">
                  {cellChange.displayOld}
                </span>
              ) : value === null || value === undefined || value === '' ? (
                <span className="text-muted-foreground italic text-xs">empty</span>
              ) : (
                String(value)
              )}
            </div>
          );

          if (showTooltip && tooltipContent) {
            return (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {cellContent}
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs whitespace-pre-wrap">
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
  }, [parsedData, columnMappings, rowChangesMap, importMode]);

  // Display first 50 rows initially
  const displayData = useMemo(() => dataWithRowNumbers.slice(0, 50), [dataWithRowNumbers]);

  const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
  const totalRows = parsedData.length;
  const displayedRows = displayData.length;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <TableIcon className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {importMode === 'add-new' 
                ? `A total of ${valid.length} rows will be added to table '${tableName}'`
                : `A total of ${valid.length} rows will be updated in table '${tableName}'`
              }
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Showing {displayedRows} of {totalRows} rows • {columns.length - 1} columns
              {invalid.length > 0 && ` • ${invalid.length} row${invalid.length !== 1 ? 's' : ''} will be skipped due to errors`}
              {warnings.length > 0 && ` • ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Table */}
      <div className="border rounded-lg bg-background">
        <VirtualizedTable
          data={displayData}
          columns={columns}
          containerHeight={containerHeight}
          rowHeight={52}
          stickyFirstColumn={true}
          className="rounded-lg"
        />
      </div>

      {totalRows > displayedRows && (
        <p className="text-sm text-muted-foreground text-center">
          Showing first {displayedRows} rows. All {totalRows} rows will be imported.
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel} size="lg">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={onImport} 
          disabled={valid.length === 0}
          size="lg"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {importMode === 'add-new' ? 'Import' : 'Update'} {valid.length} {entityType === 'contacts' ? 'Contact' : 'Opportunit'}
          {valid.length !== 1 ? (entityType === 'contacts' ? 's' : 'ies') : 'y'}
        </Button>
      </div>
    </div>
  );
}
