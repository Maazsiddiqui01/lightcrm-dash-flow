import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { validateCsvDataDynamic } from "@/utils/csvValidationDynamic";
import { normalizeCsvData, trackNormalizationChanges } from "@/utils/csvNormalization";
import { supabase } from "@/integrations/supabase/client";
import { createColumnMap, mapCsvHeaders, transformCsvData } from "@/utils/csvColumnMapper";
import type { RecordChange, FieldChange } from "@/components/data-maintenance/UpdatePreview";
import Papa from 'papaparse';
import { 
  validateCsvFile, 
  validateRowCount, 
  sanitizeImportBatch, 
  logImportAttempt 
} from "@/utils/csvImportSecurity";

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
  const [dbRecordsCache, setDbRecordsCache] = useState<Map<string, any>>(new Map());
  const { toast } = useToast();

  const parseFile = async (file: File) => {
    try {
      // Security: Validate file before processing
      const fileValidation = validateCsvFile(file);
      if (!fileValidation.valid) {
        toast({
          title: "Invalid File",
          description: fileValidation.error,
          variant: "destructive"
        });
        return;
      }

      setFile(file);
      const text = await file.text();

      // Get column mappings from database
      const columnMapResult = await createColumnMap(entityType);
      
      // Parse CSV with papaparse (handles all edge cases)
      const parseResult = Papa.parse(text, {
        header: firstRowIsHeader,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value?.trim() || null
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        console.error('CSV parsing errors:', parseResult.errors);
        toast({
          title: "Parse Error",
          description: "CSV file has formatting issues. Please check the file.",
          variant: "destructive"
        });
        return;
      }

      const data = (parseResult.data as any[]) || [];
      
      // Security: Validate row count
      const rowValidation = validateRowCount(data.length);
      if (!rowValidation.valid) {
        toast({
          title: "Invalid Data",
          description: rowValidation.error,
          variant: "destructive"
        });
        return;
      }
      
      if (data.length === 0) {
        toast({
          title: "Invalid File",
          description: "CSV file must contain data rows",
          variant: "destructive"
        });
        return;
      }

      // Security: Log import attempt (without sensitive data)
      logImportAttempt(entityType, data.length, importMode);

      // Get headers from parsed data
      const headers = firstRowIsHeader 
        ? Object.keys(data[0] || {})
        : Object.keys(data[0] || {}).map((_, i) => `column_${i}`);
      
      // Map CSV headers to database columns
      const { mapped, unmapped } = mapCsvHeaders(headers, columnMapResult.displayToColumn);
      setColumnMappings(mapped);
      setUnmappedColumns(unmapped);
      
      // Add row numbers for validation tracking
      const dataWithRowNumbers = data.map((row, idx) => ({
        ...row,
        _rowNumber: idx + (firstRowIsHeader ? 2 : 1)
      }));

      // Transform to use database column names
      const transformedData = transformCsvData(dataWithRowNumbers, mapped);
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
        // Check if ID column exists, otherwise use Deal Name fallback
        const hasIdColumn = transformedData.some(row => row.id !== null && row.id !== undefined);
        const hasDealNameColumn = entityType === 'opportunities' && transformedData.some(row => row.deal_name);
        
        if (!hasIdColumn && !hasDealNameColumn) {
          toast({
            title: "Missing Identifier",
            description: "Update mode requires either ID or Deal Name column to match existing records.",
            variant: "destructive"
          });
          return;
        }

        // If no ID but has Deal Name, fetch IDs from database
        if (!hasIdColumn && hasDealNameColumn) {
          toast({
            title: "Using Deal Name Matching",
            description: "No ID column found. Matching opportunities by Deal Name...",
          });
          
            const dealNames = transformedData
            .map(row => row.deal_name)
            .filter(Boolean);
          
          if (dealNames.length === 0) {
            toast({
              title: "No Deal Names Found",
              description: "Cannot match records without IDs or Deal Names.",
              variant: "destructive"
            });
            return;
          }

          // Fetch existing opportunities by deal name
          const { data: existingRecords } = await supabase
            .from('opportunities_raw')
            .select('id, deal_name')
            .in('deal_name', dealNames);

          if (!existingRecords || existingRecords.length === 0) {
            toast({
              title: "No Matches Found",
              description: "None of the Deal Names in your CSV match existing opportunities.",
              variant: "destructive"
            });
            return;
          }

          const dealNameToId = new Map(
            (existingRecords || []).map(r => [r.deal_name as string, r.id as string])
          );

          // Add IDs to transformed data based on deal name match
          transformedData.forEach(row => {
            if (row.deal_name && !row.id) {
              row.id = dealNameToId.get(row.deal_name) || null;
            }
          });

          toast({
            title: "Deal Name Matching Applied",
            description: `Matched ${existingRecords.length} of ${dealNames.length} opportunities by Deal Name`,
          });
        }

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
    const { data: existingRecords, error } = await supabase
      .from(tableName)
      .select('*')
      .in('id', ids);

    if (error) {
      console.error('Error fetching existing records:', error);
      return [];
    }

    if (!existingRecords) return [];

    // Cache DB records by ID for cell-level comparison
    const dbCache = new Map<string, any>();
    existingRecords.forEach(record => {
      dbCache.set(record.id, record);
    });
    setDbRecordsCache(dbCache);

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
          
          // Security: Sanitize batch before sending to database
          const sanitizedBatch = sanitizeImportBatch(batch);
          
          // Clean the data - remove internal fields
          const cleanedBatch = sanitizedBatch.map(row => {
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
    setDbRecordsCache(new Map());
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
    dbRecordsCache,
    parseFile,
    executeImport,
    reset
  };
}
