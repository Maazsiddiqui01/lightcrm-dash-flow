import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from "lucide-react";
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

            {unmappedColumns.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Unmapped columns:</strong> {unmappedColumns.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {columnMappings.size > 0 && (
              <div className="text-xs text-muted-foreground p-3 border rounded bg-muted/30">
                <div className="font-medium mb-2">Column Mappings:</div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(columnMappings.entries()).slice(0, 6).map(([csv, db]) => (
                    <div key={csv} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">{csv}</Badge>
                      <span>→</span>
                      <span className="font-mono">{db}</span>
                    </div>
                  ))}
                  {columnMappings.size > 6 && (
                    <div className="col-span-2 text-center">
                      ... and {columnMappings.size - 6} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && validationResults && (
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
