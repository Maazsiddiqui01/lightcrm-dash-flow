import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { validateCsvDataDynamic } from "@/utils/csvValidationDynamic";
import { normalizeCsvData, trackNormalizationChanges } from "@/utils/csvNormalization";
import { supabase } from "@/integrations/supabase/client";
import { createColumnMap, mapCsvHeaders, transformCsvData } from "@/utils/csvColumnMapper";
import type { RecordChange, FieldChange } from "@/components/data-maintenance/UpdatePreview";

export interface ValidationResults {
  valid: any[];
  invalid: Array<{ row: number; field: string; message: string; value: any }>;
  warnings: Array<{ row: number; message: string }>;
  normalized?: Array<{ row: number; field: string; original: string; corrected: string }>;
}

export interface ImportResults {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export type ImportMode = 'add-new' | 'update-existing';

export function useCsvImport(entityType: 'contacts' | 'opportunities') {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [progress, setProgress] = useState(0);
  const [importMode, setImportMode] = useState<ImportMode>('add-new');
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [updatePreview, setUpdatePreview] = useState<RecordChange[] | null>(null);
  const [columnMappings, setColumnMappings] = useState<Map<string, string>>(new Map());
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
  const { toast } = useToast();

  const parseFile = async (file: File) => {
    try {
      setFile(file);
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      
      const minRows = firstRowIsHeader ? 2 : 1;
      if (rows.length < minRows) {
        toast({
          title: "Invalid File",
          description: "CSV file must contain data rows",
          variant: "destructive"
        });
        return;
      }

      // Get column mappings from database
      const columnMapResult = await createColumnMap(entityType);
      
      // Parse CSV
      const startRow = firstRowIsHeader ? 0 : -1;
      const headers = firstRowIsHeader 
        ? rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
        : Object.keys(rows[0].split(',').map((_, i) => `column_${i}`));
      
      const dataRows = firstRowIsHeader ? rows.slice(1) : rows;
      
      // Map CSV headers to database columns
      const { mapped, unmapped } = mapCsvHeaders(headers, columnMapResult.displayToColumn);
      setColumnMappings(mapped);
      setUnmappedColumns(unmapped);
      
      // Parse data with original CSV headers
      const data = dataRows.map((row, idx) => {
        const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: any = { _rowNumber: idx + (firstRowIsHeader ? 2 : 1) };
        headers.forEach((header, i) => {
          obj[header] = values[i] || null;
        });
        return obj;
      });

      // Transform to use database column names
      const transformedData = transformCsvData(data, mapped);
      setParsedData(transformedData);

      // Show warnings for unmapped columns
      if (unmapped.length > 0) {
        toast({
          title: "Unmapped Columns",
          description: `${unmapped.length} columns not recognized: ${unmapped.join(', ')}`,
          variant: "default"
        });
      }

      // Validate based on mode
      if (importMode === 'update-existing') {
        const validation = await validateCsvDataDynamic(transformedData, entityType, true);
        validation.normalized = [];
        setValidationResults(validation);
        
        // Generate update preview
        if (validation.valid.length > 0) {
          const preview = await generateUpdatePreview(validation.valid, columnMapResult.columnToDisplay);
          setUpdatePreview(preview);
        }
        
        toast({
          title: "File Parsed",
          description: `Found ${transformedData.length} rows. ${validation.valid.length} valid for update.`,
        });
      } else {
        // Normalize and validate for new records
        const normalized = normalizeCsvData(transformedData, entityType);
        const normalizationChanges = trackNormalizationChanges(transformedData, normalized);
        const validation = await validateCsvDataDynamic(normalized, entityType, false);
        
        validation.normalized = normalizationChanges;
        setValidationResults(validation);
        
        toast({
          title: "File Parsed",
          description: `Found ${transformedData.length} rows. ${validation.valid.length} valid, ${validation.invalid.length} with errors.`,
        });
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : "Failed to parse CSV file. Please check the format.",
        variant: "destructive"
      });
    }
  };

  const generateUpdatePreview = async (
    validRows: any[],
    columnToDisplay: Map<string, string>
  ): Promise<RecordChange[]> => {
    const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
    const ids = validRows.map(row => row.id).filter(Boolean);
    
    if (ids.length === 0) return [];

    // Fetch existing records
    const { data: existingRecords } = await supabase
      .from(tableName)
      .select('*')
      .in('id', ids);

    if (!existingRecords) return [];

    const existingMap = new Map(existingRecords.map(record => [record.id, record]));
    const changes: RecordChange[] = [];

    validRows.forEach(newRow => {
      const existingRow = existingMap.get(newRow.id);
      if (!existingRow) return;

      const recordChanges: FieldChange[] = [];
      const recordName = entityType === 'opportunities' 
        ? (existingRow as any).deal_name 
        : (existingRow as any).first_name || (existingRow as any).last_name || 'Unknown';

      // Compare all fields
      Object.keys(newRow).forEach(columnName => {
        if (columnName === 'id' || columnName === '_rowNumber' || columnName === 'created_at' || columnName === 'updated_at') {
          return;
        }

        const newValue = newRow[columnName];
        const oldValue = existingRow[columnName];
        
        // Detect changes
        if (newValue !== oldValue) {
          let changeType: 'added' | 'updated' | 'cleared' = 'updated';
          
          if ((oldValue === null || oldValue === '') && newValue) {
            changeType = 'added';
          } else if (oldValue && (newValue === null || newValue === '')) {
            changeType = 'cleared';
          }

          recordChanges.push({
            field: columnName,
            displayName: columnToDisplay.get(columnName) || columnName,
            oldValue: oldValue,
            newValue: newValue,
            changeType
          });
        }
      });

      if (recordChanges.length > 0) {
        changes.push({
          id: newRow.id,
          recordName,
          changes: recordChanges
        });
      }
    });

    return changes;
  };

  const executeImport = async () => {
    if (!validationResults || validationResults.valid.length === 0) {
      return;
    }

    const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
    const validRows = validationResults.valid;
    const batchSize = 50;
    const batches = Math.ceil(validRows.length / batchSize);

    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];

    try {
      if (importMode === 'update-existing') {
        // Update existing records
        for (let i = 0; i < batches; i++) {
          const batch = validRows.slice(i * batchSize, (i + 1) * batchSize);
          
          // Clean the data - remove internal fields
          const cleanedBatch = batch.map(row => {
            const { _rowNumber, ...cleanRow } = row;
            return cleanRow;
          });

          const { error } = await supabase
            .from(tableName)
            .upsert(cleanedBatch, { onConflict: 'id' });

          if (error) {
            failed += batch.length;
            batch.forEach(row => {
              errors.push({ row: row._rowNumber || 0, error: error.message });
            });
          } else {
            successful += batch.length;
          }

          setProgress(Math.round(((i + 1) / batches) * 100));
        }
      } else {
        // Add new records - existing logic
        for (let i = 0; i < batches; i++) {
          const batch = validRows.slice(i * batchSize, (i + 1) * batchSize);
          
          // Check for duplicates before inserting
          if (entityType === 'contacts') {
            const emails = batch.map(row => row.email_address).filter(Boolean);
            const { data: existing } = await supabase
              .from('contacts_raw')
              .select('email_address')
              .in('email_address', emails);

            const existingEmails = new Set(existing?.map(r => r.email_address) || []);
            
            // Filter out duplicates
            const nonDuplicates = batch.filter(row => {
              if (existingEmails.has(row.email_address)) {
                skipped++;
                return false;
              }
              return true;
            });

            if (nonDuplicates.length === 0) {
              setProgress(Math.round(((i + 1) / batches) * 100));
              continue;
            }

            const { error } = await supabase
              .from(tableName)
              .insert(nonDuplicates);

            if (error) {
              failed += nonDuplicates.length;
              nonDuplicates.forEach(row => {
                errors.push({ row: row._rowNumber || 0, error: error.message });
              });
            } else {
              successful += nonDuplicates.length;
            }
          } else {
            // For opportunities, check for duplicates based on deal_name
            const dealNames = batch.map(row => row.deal_name).filter(Boolean);
            const { data: existing } = await supabase
              .from('opportunities_raw')
              .select('deal_name')
              .in('deal_name', dealNames);

            const existingDeals = new Set(existing?.map(r => r.deal_name) || []);
            
            // Filter out duplicates
            const nonDuplicates = batch.filter(row => {
              if (existingDeals.has(row.deal_name)) {
                skipped++;
                return false;
              }
              return true;
            });

            if (nonDuplicates.length === 0) {
              setProgress(Math.round(((i + 1) / batches) * 100));
              continue;
            }

            const { error } = await supabase
              .from(tableName)
              .insert(nonDuplicates);

            if (error) {
              failed += nonDuplicates.length;
              nonDuplicates.forEach(row => {
                errors.push({ row: row._rowNumber || 0, error: error.message });
              });
            } else {
              successful += nonDuplicates.length;
            }
          }

          setProgress(Math.round(((i + 1) / batches) * 100));
        }
      }

      setImportResults({
        total: validRows.length,
        successful,
        failed,
        errors
      });

      const actionText = importMode === 'update-existing' ? 'updated' : 'imported';
      const messages = [
        `Successfully ${actionText} ${successful} ${entityType}`,
        skipped > 0 ? `Skipped ${skipped} duplicates` : null,
        failed > 0 ? `Failed ${failed}` : null
      ].filter(Boolean);

      toast({
        title: importMode === 'update-existing' ? "Update Completed" : "Import Completed",
        description: messages.join(', '),
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: importMode === 'update-existing' ? "Update Failed" : "Import Failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setValidationResults(null);
    setImportResults(null);
    setProgress(0);
    setUpdatePreview(null);
    setColumnMappings(new Map());
    setUnmappedColumns([]);
  };

  return {
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
    parseFile,
    executeImport,
    reset
  };
}
