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
  errors: Array<{ row: number; error: string; data?: any }>;
  skipped?: number;
  startTime?: number;
  endTime?: number;
  batches?: {
    total: number;
    successful: number;
    failed: number;
  };
}

export type ImportMode = 'add-new' | 'update-existing';
export type MatchingStrategy = 'id' | 'deal_name' | 'auto';

export function useCsvImport(entityType: 'contacts' | 'opportunities') {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [progress, setProgress] = useState(0);
  const [importMode, setImportMode] = useState<ImportMode>('add-new');
  const [matchingStrategy, setMatchingStrategy] = useState<MatchingStrategy>('auto');
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
      
      console.debug('[CSV Import] RAW parsed data first row:', data[0]);
      console.debug('[CSV Import] Detected headers:', headers);
      
      // Map CSV headers to database columns
      const { mapped, unmapped } = mapCsvHeaders(headers, columnMapResult.displayToColumn);
      console.debug('[CSV Import] Mapped columns:', Array.from(mapped.entries()));
      console.debug('[CSV Import] Unmapped columns:', unmapped);
      
      setColumnMappings(mapped);
      setUnmappedColumns(unmapped);
      
      // Add row numbers for validation tracking
      const dataWithRowNumbers = data.map((row, idx) => ({
        ...row,
        _rowNumber: idx + (firstRowIsHeader ? 2 : 1)
      }));

      // Transform to use database column names
      const transformedData = transformCsvData(dataWithRowNumbers, mapped);
      console.debug('[CSV Import] Sample transformed rows (first 2):');
      transformedData.slice(0, 2).forEach((row, idx) => {
        console.debug(`  Row ${idx}:`, row);
        console.debug(`  Row ${idx} keys:`, Object.keys(row));
      });
      setParsedData(transformedData);

      // Show warnings for unmapped columns
      if (unmapped.length > 0) {
        toast({
          title: "Unmapped Columns",
          description: `${unmapped.length} columns not recognized: ${unmapped.join(', ')}`,
          variant: "default"
        });
      }

      // HYBRID STRATEGY: Auto-match existing records by deal_name for opportunities
      console.debug('[CSV Import] Starting hybrid validation strategy');
      
      let rowsForUpdate: any[] = [];
      let rowsForInsert: any[] = [];
      
      if (entityType === 'opportunities') {
        const dealNames = transformedData
          .map(row => row.deal_name)
          .filter(Boolean);
        
        if (dealNames.length > 0) {
          // Fetch existing opportunities by deal name
          const { data: existingRecords } = await supabase
            .from('opportunities_raw')
            .select('id, deal_name')
            .in('deal_name', dealNames);

          const dealNameToId = new Map(
            (existingRecords || []).map(r => [r.deal_name as string, r.id as string])
          );

          // Partition rows into updates and inserts based on matching
          transformedData.forEach(row => {
            if (row.id) {
              // Already has ID - definitely an update
              row.__intent = 'update';
              rowsForUpdate.push(row);
            } else if (row.deal_name && dealNameToId.has(row.deal_name)) {
              // Matched by deal name - convert to update
              row.id = dealNameToId.get(row.deal_name);
              row.__intent = 'update';
              rowsForUpdate.push(row);
            } else {
              // No match - insert as new
              row.__intent = 'insert';
              rowsForInsert.push(row);
            }
          });
          
          console.debug(`[CSV Import] Partitioned: ${rowsForUpdate.length} updates, ${rowsForInsert.length} inserts`);
        } else {
          // No deal names, all are inserts
          rowsForInsert = transformedData.map(row => ({ ...row, __intent: 'insert' }));
        }
      } else {
        // Contacts: partition by ID presence
        transformedData.forEach(row => {
          if (row.id) {
            row.__intent = 'update';
            rowsForUpdate.push(row);
          } else {
            row.__intent = 'insert';
            rowsForInsert.push(row);
          }
        });
      }

      // Validate updates (isUpdate=true, no normalization)
      let updateValidation: ValidationResults = { valid: [], invalid: [], warnings: [] };
      if (rowsForUpdate.length > 0) {
        updateValidation = await validateCsvDataDynamic(rowsForUpdate, entityType, true);
        console.debug(`[CSV Import] Updates validated: ${updateValidation.valid.length} valid, ${updateValidation.invalid.length} invalid`);
      }

      // Validate inserts (isUpdate=false, with normalization)
      let insertValidation: ValidationResults = { valid: [], invalid: [], warnings: [] };
      if (rowsForInsert.length > 0) {
        const normalized = normalizeCsvData(rowsForInsert, entityType);
        const normalizationChanges = trackNormalizationChanges(rowsForInsert, normalized);
        insertValidation = await validateCsvDataDynamic(normalized, entityType, false);
        insertValidation.normalized = normalizationChanges;
        console.debug(`[CSV Import] Inserts validated: ${insertValidation.valid.length} valid, ${insertValidation.invalid.length} invalid`);
      }

      // Merge validation results
      const mergedValidation: ValidationResults = {
        valid: [...updateValidation.valid, ...insertValidation.valid],
        invalid: [...updateValidation.invalid, ...insertValidation.invalid],
        warnings: [...updateValidation.warnings, ...insertValidation.warnings],
        normalized: insertValidation.normalized || []
      };
      
      setValidationResults(mergedValidation);

      // Generate update preview for rows that will be updated
      if (updateValidation.valid.length > 0) {
        const preview = await generateUpdatePreview(updateValidation.valid, columnMapResult.columnToDisplay);
        setUpdatePreview(preview);
      }

      // Show summary toast
      const summary = [
        rowsForUpdate.length > 0 ? `${rowsForUpdate.length} potential updates` : null,
        rowsForInsert.length > 0 ? `${rowsForInsert.length} potential inserts` : null
      ].filter(Boolean).join(', ');
      
      toast({
        title: "File Parsed - Hybrid Import",
        description: `Found ${transformedData.length} rows: ${summary}. ${mergedValidation.valid.length} valid, ${mergedValidation.invalid.length} with errors.`,
      });
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
    // Collect all validation errors first
    const validationErrors: Array<{ row: number; error: string }> = [];
    
    if (validationResults) {
      // Add invalid row errors
      validationResults.invalid.forEach(invalid => {
        validationErrors.push({
          row: invalid.row,
          error: `${invalid.field}: ${invalid.message} (value: "${invalid.value || 'empty'}")`
        });
      });
      
      // Add warnings as errors too (they should still be visible)
      validationResults.warnings.forEach(warning => {
        validationErrors.push({
          row: warning.row,
          error: `⚠️ ${warning.message}`
        });
      });
    }

    // If no valid rows, set results with validation errors and return
    if (!validationResults || validationResults.valid.length === 0) {
      const totalRows = parsedData.length;
      setImportResults({
        total: totalRows,
        successful: 0,
        failed: totalRows,
        errors: validationErrors.length > 0 ? validationErrors : [
          { row: 0, error: 'No valid rows found. Please check your CSV file and column mappings.' }
        ]
      });
      
      toast({
        title: "Import Failed",
        description: `All ${totalRows} rows have validation errors. See details below.`,
        variant: "destructive"
      });
      return;
    }

    const tableName = entityType === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
    const validRows = validationResults.valid;
    const batchSize = 50;
    const batches = Math.ceil(validRows.length / batchSize);
    const startTime = Date.now();

    let successful = 0;
    let failed = 0;
    let skipped = 0;
    let batchesSuccessful = 0;
    let batchesFailed = 0;
    const errors: Array<{ row: number; error: string; data?: any }> = [...validationErrors];

    // Partition valid rows by intent
    const rowsToUpdate = validRows.filter(row => row.__intent === 'update');
    const rowsToInsert = validRows.filter(row => row.__intent === 'insert');
    
    let updatedCount = 0;
    let insertedCount = 0;
    
    console.debug(`[CSV Import] Executing: ${rowsToUpdate.length} updates, ${rowsToInsert.length} inserts`);

    try {
      // PHASE 1: Execute updates
      if (rowsToUpdate.length > 0) {
        const updateBatches = Math.ceil(rowsToUpdate.length / batchSize);
        for (let i = 0; i < updateBatches; i++) {
          const batch = rowsToUpdate.slice(i * batchSize, (i + 1) * batchSize);
          const sanitizedBatch = sanitizeImportBatch(batch);
          const cleanedBatch = sanitizedBatch.map(row => {
            const { _rowNumber, __intent, ...cleanRow } = row;
            return cleanRow;
          });

          const { error } = await supabase
            .from(tableName)
            .upsert(cleanedBatch, { onConflict: 'id' });

          if (error) {
            console.error(`[CSV Import] UPDATE batch ${i+1} failed:`, error.message, error.details, error.hint);
            batchesFailed++;
            for (const row of batch) {
              const { _rowNumber, __intent, ...cleanRow } = sanitizeImportBatch([row])[0];
              const { error: rowError } = await supabase
                .from(tableName)
                .upsert([cleanRow], { onConflict: 'id' });
              
              if (rowError) {
                failed++;
                errors.push({ row: row._rowNumber || 0, error: rowError.message, data: row });
              } else {
                successful++;
                updatedCount++;
              }
            }
          } else {
            successful += batch.length;
            updatedCount += batch.length;
            batchesSuccessful++;
          }

          const totalBatches = updateBatches + Math.ceil(rowsToInsert.length / batchSize);
          setProgress(Math.round(((i + 1) / totalBatches) * 100));
        }
      }

      // PHASE 2: Execute inserts with deduplication
      if (rowsToInsert.length > 0) {
        const insertBatches = Math.ceil(rowsToInsert.length / batchSize);
        for (let i = 0; i < insertBatches; i++) {
          const batch = rowsToInsert.slice(i * batchSize, (i + 1) * batchSize);
          
          // Deduplicate within this CSV by deal_name/email before inserting
          const seenKeys = new Set<string>();
          const deduplicatedBatch = batch.filter(row => {
            const key = entityType === 'opportunities' ? row.deal_name : row.email_address;
            if (!key || seenKeys.has(key)) {
              skipped++;
              return false;
            }
            seenKeys.add(key);
            return true;
          });

          if (deduplicatedBatch.length === 0) {
            const totalBatches = Math.ceil(rowsToUpdate.length / batchSize) + insertBatches;
            setProgress(Math.round(((Math.ceil(rowsToUpdate.length / batchSize) + i + 1) / totalBatches) * 100));
            continue;
          }

          const sanitizedBatch = sanitizeImportBatch(deduplicatedBatch);
          const cleanedBatch = sanitizedBatch.map(row => {
            const { _rowNumber, __intent, ...cleanRow } = row;
            return cleanRow;
          });

          const { error } = await supabase
            .from(tableName)
            .insert(cleanedBatch);

          if (error) {
            console.error(`[CSV Import] INSERT batch ${i+1} failed:`, error.message, error.details, error.hint);
            batchesFailed++;
            for (const row of deduplicatedBatch) {
              const { _rowNumber, __intent, ...cleanRow } = sanitizeImportBatch([row])[0];
              const { error: rowError } = await supabase
                .from(tableName)
                .insert([cleanRow]);
              
              if (rowError) {
                failed++;
                errors.push({ row: row._rowNumber || 0, error: rowError.message, data: row });
              } else {
                successful++;
                insertedCount++;
              }
            }
          } else {
            successful += cleanedBatch.length;
            insertedCount += cleanedBatch.length;
            batchesSuccessful++;
          }

          const totalBatches = Math.ceil(rowsToUpdate.length / batchSize) + insertBatches;
          setProgress(Math.round(((Math.ceil(rowsToUpdate.length / batchSize) + i + 1) / totalBatches) * 100));
        }
      }

      // Calculate total including validation errors
      const totalAttempted = validRows.length;
      const totalWithValidation = parsedData.length;
      const failedValidation = validationErrors.length;
      const endTime = Date.now();
      
      setImportResults({
        total: totalWithValidation,
        successful,
        failed: failed + failedValidation,
        skipped,
        errors,
        startTime,
        endTime,
        batches: {
          total: batches,
          successful: batchesSuccessful,
          failed: batchesFailed
        }
      });

      // Build clear summary message
      const messages = [
        updatedCount > 0 ? `Updated ${updatedCount}` : null,
        insertedCount > 0 ? `Inserted ${insertedCount}` : null,
        skipped > 0 ? `Skipped ${skipped} duplicates` : null,
        failed > 0 ? `Failed ${failed}` : null,
        failedValidation > 0 ? `${failedValidation} validation errors` : null
      ].filter(Boolean);

      toast({
        title: "Import Completed",
        description: messages.join(' • '),
      });
    } catch (error: any) {
      console.error('Import error:', error);
      
      // Ensure we always set import results even on catastrophic failure
      const totalRows = parsedData.length;
      const errorMessage = error?.message || 'An unexpected error occurred';
      const errorDetails = error?.details || error?.hint || '';
      const endTime = Date.now();
      
      setImportResults({
        total: totalRows,
        successful: successful || 0,
        failed: totalRows - (successful || 0),
        skipped,
        errors: [
          ...errors,
          { 
            row: 0, 
            error: `❌ System Error: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`
          }
        ],
        startTime,
        endTime,
        batches: {
          total: batches,
          successful: batchesSuccessful,
          failed: batchesFailed
        }
      });
      
      toast({
        title: importMode === 'update-existing' ? "Update Failed" : "Import Failed",
        description: errorMessage,
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
  };
}
