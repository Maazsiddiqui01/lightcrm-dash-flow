import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VirtualizedTable } from "@/components/shared/VirtualizedTable";
import { Upload, X, Table as TableIcon } from "lucide-react";
import type { ValidationResults } from "@/hooks/useCsvImport";
import { useMemo } from "react";

interface CsvTablePreviewProps {
  parsedData: any[];
  validationResults: ValidationResults;
  columnMappings: Map<string, string>;
  entityType: 'contacts' | 'opportunities';
  importMode: 'add-new' | 'update-existing';
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
  onImport,
  onCancel,
  containerHeight = 600
}: CsvTablePreviewProps) {
  const { valid, invalid, warnings } = validationResults;

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
        render: (value: any) => {
          if (value === null || value === undefined || value === '') {
            return <span className="text-muted-foreground italic text-xs">empty</span>;
          }
          return <span className="text-sm">{String(value)}</span>;
        }
      }))
    ];
  }, [parsedData, columnMappings]);

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
