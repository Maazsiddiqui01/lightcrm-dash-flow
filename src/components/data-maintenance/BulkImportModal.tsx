import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, CheckCircle2, Download, Table as TableIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useCsvImport } from "@/hooks/useCsvImport";
import { CsvTablePreview } from "./CsvTablePreview";
import { ImportResults } from "./ImportResults";
import { generateTemplate } from "@/utils/csvValidation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'contacts' | 'opportunities';
  onImportComplete?: () => void;
}

export function BulkImportModal({ open, onOpenChange, entityType, onImportComplete }: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [dragActive, setDragActive] = useState(false);
  
  const {
    file,
    parsedData,
    validationResults,
    importResults,
    progress,
    importMode,
    setImportMode,
    matchingStrategy,
    setMatchingStrategy,
    firstRowIsHeader,
    setFirstRowIsHeader,
    updatePreview,
    columnMappings,
    unmappedColumns,
    dbRecordsCache,
    parseFile,
    executeImport,
    reset
  } = useCsvImport(entityType);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      return;
    }
    
    await parseFile(file);
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    await executeImport();
    setStep('results');
  };

  const handleClose = () => {
    reset();
    setStep('upload');
    onOpenChange(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const { downloadCsvTemplate } = await import('@/utils/csvTemplateGenerator');
      await downloadCsvTemplate(entityType);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import {entityType === 'contacts' ? 'Contacts' : 'Opportunities'}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import {entityType}. Download the template for proper formatting.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Import Mode</Label>
                <ToggleGroup 
                  type="single" 
                  value={importMode} 
                  onValueChange={(value) => value && setImportMode(value as any)}
                  className="justify-start"
                >
                  <ToggleGroupItem value="add-new" className="flex-1">
                    Add New {entityType === 'contacts' ? 'Contacts' : 'Opportunities'}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="update-existing" className="flex-1">
                    Update Existing
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {importMode === 'update-existing' && entityType === 'opportunities' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-sm font-medium">Matching Strategy</Label>
                  <ToggleGroup 
                    type="single" 
                    value={matchingStrategy} 
                    onValueChange={(value) => value && setMatchingStrategy(value as any)}
                    className="justify-start flex-col sm:flex-row"
                  >
                    <ToggleGroupItem value="auto" className="flex-1 text-xs">
                      🔄 Auto-detect
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Let system decide</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="id" className="flex-1 text-xs">
                      🔑 Match by ID
                      <span className="block text-[10px] text-muted-foreground mt-0.5">Most reliable</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="deal_name" className="flex-1 text-xs">
                      📝 Match by Deal Name
                      <span className="block text-[10px] text-muted-foreground mt-0.5">If ID missing</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <p className="text-xs text-muted-foreground">
                    {matchingStrategy === 'auto' && '✨ Will use ID column if present, otherwise Deal Name'}
                    {matchingStrategy === 'id' && '🔑 Requires ID column in your CSV'}
                    {matchingStrategy === 'deal_name' && '📝 Requires Deal Name column in your CSV'}
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="first-row-header" 
                  checked={firstRowIsHeader}
                  onCheckedChange={(checked) => setFirstRowIsHeader(checked === true)}
                />
                <Label 
                  htmlFor="first-row-header" 
                  className="text-sm font-normal cursor-pointer"
                >
                  First row is header
                </Label>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors
                ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                hover:border-primary hover:bg-primary/5
              `}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports CSV files up to 10MB
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong>
                {importMode === 'update-existing' 
                  ? ' Your CSV must include the ID column to match existing records. Column headers will be automatically mapped to database fields.'
                  : ' Your CSV must follow the template format. Invalid rows will be rejected automatically to maintain data integrity.'
                }
              </AlertDescription>
            </Alert>

            {columnMappings.size > 0 && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong className="text-green-900 dark:text-green-100">
                    ✅ {columnMappings.size} column{columnMappings.size !== 1 ? 's' : ''} matched successfully
                  </strong>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {Array.from(columnMappings.entries()).slice(0, 8).map(([csv, db]) => (
                      <div key={csv} className="flex items-center gap-2 bg-white/50 dark:bg-black/20 p-1.5 rounded">
                        <Badge variant="outline" className="text-[10px] bg-blue-50 border-blue-200">{csv}</Badge>
                        <span className="text-green-600">→</span>
                        <span className="font-mono text-green-700 dark:text-green-300 text-[10px]">{db}</span>
                      </div>
                    ))}
                  </div>
                  {columnMappings.size > 8 && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      ... and {columnMappings.size - 8} more columns
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {unmappedColumns.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Extra columns detected ({unmappedColumns.length})</strong>
                  <p className="mt-1 text-xs">
                    These columns don't match database fields and will be <strong>automatically ignored</strong>:
                  </p>
                  <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded border max-h-20 overflow-y-auto">
                    {unmappedColumns.join(', ')}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    ℹ️ Only matched columns will be imported. This is normal if your CSV contains extra data.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'preview' && validationResults && (
          <div className="space-y-4">
            {/* Validation Summary */}
            <Card>
              <div className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Import Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                    <p className="text-2xl font-bold">{parsedData.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">✅ Valid</p>
                    <p className="text-2xl font-bold text-green-600">{validationResults.valid.length}</p>
                    {validationResults.valid.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Will be {importMode === 'add-new' ? 'imported' : 'updated'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">❌ Invalid</p>
                    <p className="text-2xl font-bold text-red-600">{validationResults.invalid.length}</p>
                    {validationResults.invalid.length > 0 && (
                      <p className="text-xs text-red-600">
                        🔴 {validationResults.invalid.length} blocking error{validationResults.invalid.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                {validationResults.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      🟡 {validationResults.warnings.length} warning{validationResults.warnings.length !== 1 ? 's' : ''} (can still import)
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <CsvTablePreview
              parsedData={parsedData}
              validationResults={validationResults}
              columnMappings={columnMappings}
              entityType={entityType}
              importMode={importMode}
              dbRecordsCache={dbRecordsCache}
              onImport={handleImport}
              onCancel={() => setStep('upload')}
            />
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-lg font-medium">Importing {entityType}...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we process your data
              </p>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground">
              {progress}% complete
            </p>
          </div>
        )}

        {step === 'results' && importResults && (
          <ImportResults
            results={importResults}
            entityType={entityType}
            onClose={() => {
              handleClose();
              onImportComplete?.();
            }}
            onImportMore={() => {
              reset();
              setStep('upload');
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
