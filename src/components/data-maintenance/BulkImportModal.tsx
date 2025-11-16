import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useCsvImport } from "@/hooks/useCsvImport";
import { CsvTablePreview } from "./CsvTablePreview";
import { ImportResults } from "./ImportResults";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
    hasHeaderRow,
    columnMappings,
    dbRecordsCache,
    parseFile,
    executeImport,
    reset,
    setHasHeaderRow,
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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) return;
    await parseFile(selectedFile);
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
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import {entityType === 'contacts' ? 'Contacts' : 'Opportunities'}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import {entityType}. Download the template for proper formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-4">
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertTitle>Upsert Mode (Smart Import)</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <p>Upload a CSV with {entityType}. The system will automatically:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Update</strong> records with existing <code className="bg-muted px-1 rounded">id</code> values</li>
                    <li><strong>Update</strong> records matched by <code className="bg-muted px-1 rounded">{entityType === 'opportunities' ? 'deal_name' : 'email_address'}</code></li>
                    <li><strong>Insert</strong> new records that don't match existing data</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="first-row-header" 
                  checked={hasHeaderRow}
                  onCheckedChange={(checked) => setHasHeaderRow(checked === true)}
                />
                <Label htmlFor="first-row-header" className="text-sm font-normal cursor-pointer">
                  First row is header
                </Label>
              </div>

              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'} hover:border-primary hover:bg-primary/5`}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Drop your CSV file here or click to browse</p>
                <p className="text-sm text-muted-foreground">{file ? `Selected: ${file.name}` : 'Supports .csv files'}</p>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileUpload(selectedFile);
                  }}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import Guidelines</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                    <li>To <strong>update existing records</strong>, include the <code className="bg-muted px-1 rounded">id</code> column</li>
                    <li>To <strong>match by name</strong>, ensure <code className="bg-muted px-1 rounded">{entityType === 'opportunities' ? 'deal_name' : 'email_address'}</code> is accurate</li>
                    <li>Records without ID or matching name will be created as new entries</li>
                    <li>Empty cells and "null" values will be treated as null in the database</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'preview' && validationResults && (
            <div className="h-[70vh] flex flex-col">
              <CsvTablePreview
                parsedData={parsedData}
                validationResults={validationResults}
                columnMappings={columnMappings}
                entityType={entityType}
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
                <h3 className="text-lg font-semibold mb-2">Importing Data...</h3>
                <p className="text-muted-foreground">Please wait while we process your {entityType}</p>
              </div>
              {progress > 0 && (
                <div className="max-w-md mx-auto space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">{Math.round(progress)}% Complete</p>
                </div>
              )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
