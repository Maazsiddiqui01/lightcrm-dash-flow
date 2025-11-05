import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Table as TableIcon, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { ValidationResults } from "@/hooks/useCsvImport";
import { useMemo, useState } from "react";
import { generateRowChanges } from "@/utils/csvDiffEngine";
import type { RowChanges } from "@/utils/csvDiffEngine";
import { cn } from "@/lib/utils";
import { EnhancedCsvPreviewTable } from "./EnhancedCsvPreviewTable";
import { CsvPreviewToolbar } from "./CsvPreviewToolbar";

type ViewFilter = 'all' | 'correct' | 'warning' | 'invalid';

interface CsvTablePreviewProps {
  parsedData: any[];
  validationResults: ValidationResults;
  columnMappings: Map<string, string>;
  entityType: 'contacts' | 'opportunities';
  importMode: 'add-new' | 'update-existing';
  dbRecordsCache?: Map<string, any>;
  onImport: () => void;
  onCancel: () => void;
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
}: CsvTablePreviewProps) {
  const { valid, invalid, warnings } = validationResults;
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [textWrap, setTextWrap] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Generate cell-level changes for update mode
  const rowChangesMap = useMemo<Map<number, RowChanges>>(() => {
    if (importMode !== 'update-existing' || !dbRecordsCache || dbRecordsCache.size === 0) {
      return new Map();
    }

    const dbRecordsObj = Object.fromEntries(dbRecordsCache);
    const rowChanges = generateRowChanges(parsedData, dbRecordsObj, columnMappings, 'id');
    
    return new Map(rowChanges.map(rc => [rc.rowIndex, rc]));
  }, [parsedData, dbRecordsCache, columnMappings, importMode]);

  // Map row index to validation status with enhanced messages
  const rowStatusMap = useMemo(() => {
    const statusMap = new Map<number, { status: 'valid' | 'warning' | 'invalid', messages: string[], warnings?: string[] }>();
    
    // Mark invalid rows
    invalid.forEach(item => {
      const rowIndex = item.row - 1;
      const existingStatus = statusMap.get(rowIndex) || { status: 'invalid' as const, messages: [] };
      existingStatus.messages.push(`${item.field}: ${item.message}`);
      statusMap.set(rowIndex, existingStatus);
    });
    
    // Mark warning rows
    warnings.forEach(item => {
      const rowIndex = item.row - 1;
      const existingStatus = statusMap.get(rowIndex);
      if (!existingStatus || existingStatus.status !== 'invalid') {
        const warningMessages = existingStatus?.warnings || [];
        warningMessages.push(item.message);
        statusMap.set(rowIndex, { 
          status: 'warning' as const, 
          messages: existingStatus?.messages || [`Row has ${warningMessages.length} warning(s)`],
          warnings: warningMessages
        });
      }
    });
    
    // Mark valid rows
    parsedData.forEach((_, index) => {
      if (!statusMap.has(index)) {
        statusMap.set(index, { 
          status: 'valid' as const, 
          messages: ['Row is valid and ready to import']
        });
      }
    });
    
    return statusMap;
  }, [parsedData, invalid, warnings]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    const dataWithIndex = parsedData.map((row, index) => ({
      ...row,
      __index: index
    }));

    if (viewFilter === 'all') return dataWithIndex;
    
    return dataWithIndex.filter((row, idx) => {
      const status = rowStatusMap.get(idx);
      if (!status) return false;
      
      if (viewFilter === 'correct') return status.status === 'valid';
      if (viewFilter === 'warning') return status.status === 'warning';
      if (viewFilter === 'invalid') return status.status === 'invalid';
      
      return true;
    });
  }, [parsedData, viewFilter, rowStatusMap]);

  // Calculate counts for status filtering
  const counts = useMemo(() => {
    let validCount = 0;
    let warningCount = 0;
    let invalidCount = 0;
    
    rowStatusMap.forEach((status) => {
      if (status.status === 'valid') validCount++;
      else if (status.status === 'warning') warningCount++;
      else if (status.status === 'invalid') invalidCount++;
    });
    
    return {
      total: parsedData.length,
      valid: validCount,
      warning: warningCount,
      invalid: invalidCount,
    };
  }, [rowStatusMap, parsedData.length]);

  // Build change map for highlighting
  const changeMap = useMemo(() => {
    const map = new Map<number, Set<string>>();
    rowChangesMap.forEach((rowChange, rowIndex) => {
      const changedCols = new Set<string>();
      Object.entries(rowChange.cellChanges).forEach(([col, change]) => {
        if (change.changeType !== 'unchanged') {
          changedCols.add(col);
        }
      });
      if (changedCols.size > 0) {
        map.set(rowIndex, changedCols);
      }
    });
    return map;
  }, [rowChangesMap]);

  // Prepare columns for the enhanced table
  const columns = useMemo(() => 
    Array.from(columnMappings.entries()).map(([key, label]) => ({
      key,
      label,
      width: 150,
    }))
  , [columnMappings]);

  const handleResetColumns = () => {
    setResetKey(prev => prev + 1);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        {/* Validation Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Validation Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{counts.total}</p>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{counts.valid}</p>
                  <p className="text-sm text-muted-foreground">
                    ✅ Valid - Ready to {importMode === 'add-new' ? 'import' : 'update'}
                  </p>
                </div>
              </div>
              
              {counts.invalid > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{counts.invalid}</p>
                    <p className="text-sm text-muted-foreground">
                      ❌ Invalid - Blocking errors
                    </p>
                  </div>
                </div>
              )}
            </div>

            {counts.warning > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  🟡 <strong>{counts.warning} rows have warnings</strong> but can still be imported. 
                  Hover over the warning icon to see details.
                </AlertDescription>
              </Alert>
            )}

            {counts.invalid > 0 && counts.valid > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Partial Import Mode:</strong> {counts.valid} valid rows will be processed. 
                  {counts.invalid} invalid rows will be skipped.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Table with Toolbar */}
        <Card>
          <CardHeader>
            <CardTitle>Import Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CsvPreviewToolbar
              viewFilter={viewFilter}
              onViewFilterChange={setViewFilter}
              textWrap={textWrap}
              onToggleTextWrap={() => setTextWrap(!textWrap)}
              onResetColumns={handleResetColumns}
              counts={counts}
            />
            
            <div className="p-4">
              {filteredData.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No rows match the selected filter. Try selecting "All Rows" to see all data.
                  </AlertDescription>
                </Alert>
              ) : (
                <EnhancedCsvPreviewTable
                  key={resetKey}
                  data={filteredData}
                  columns={columns}
                  rowStatusMap={rowStatusMap}
                  entityType={entityType}
                  textWrap={textWrap}
                  onToggleTextWrap={() => setTextWrap(!textWrap)}
                  highlightChanges={importMode === 'update-existing'}
                  changeMap={changeMap}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pre-Import Validation Warning */}
        {counts.valid === 0 && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-destructive mb-1">
                    Cannot Import: All Rows Have Errors
                  </h4>
                  <p className="text-sm text-destructive/90 mb-2">
                    🔴 <strong>{counts.invalid} blocking error{counts.invalid !== 1 ? 's' : ''}</strong> must be fixed before importing.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fix the errors shown above, then re-upload your CSV file to try again.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Sticky footer with actions - ALWAYS VISIBLE */}
      <div className="sticky bottom-0 z-40 bg-background border-t shadow-lg mt-4 p-4 flex justify-between items-center gap-4">
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
                  disabled={counts.valid === 0}
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
                  All {counts.total} rows have validation errors. Fix the errors shown above and re-upload your CSV to continue.
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
