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
import { cleanRowForDatabase } from "@/utils/databaseUpdateHelpers";
import { parseSupabaseError } from "@/utils/supabaseErrorParser";
import { 
  mapRowsToDbColumns, 
  mapHeaderToColumn,
  READ_ONLY_OPPORTUNITY_COLUMNS,
  parseCsvToOpportunities
} from "@/utils/opportunityColumnMapping";
import { normalizeCsvRow } from "@/utils/csvNormalizer";

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
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
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
        header: hasHeaderRow,
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
      logImportAttempt(entityType, data.length, 'upsert');

      // Get headers from parsed data
      const csvHeaders = hasHeaderRow 
        ? Object.keys(data[0] || {})
        : Object.keys(data[0] || {}).map((_, i) => `column_${i}`);
      
      console.debug('[CSV Import] RAW parsed data first row:', data[0]);
      console.debug('[CSV Import] Detected CSV headers:', csvHeaders);
      
      // For opportunities, use the enhanced parsing system
      if (entityType === 'opportunities') {
        // Use the dedicated parsing function
        const parseResult = parseCsvToOpportunities({
          headers: csvHeaders,
          rows: data
        });
        
        // Add row numbers for tracking
        const transformedData = parseResult.data.map((row, idx) => ({
          ...row,
          _rowNumber: idx + (hasHeaderRow ? 2 : 1)
        }));
        
        // Store mappings for preview (only valid, non-read-only columns)
        const mappedColumns = new Map<string, string>();
        csvHeaders.forEach(header => {
          const dbCol = mapHeaderToColumn(header);
          if (dbCol && (dbCol === 'id' || !READ_ONLY_OPPORTUNITY_COLUMNS.includes(dbCol as any))) {
            mappedColumns.set(header, dbCol);
          }
        });
        
        setColumnMappings(mappedColumns);
        setUnmappedColumns(parseResult.warnings.invalidColumns);
        
        // Show warnings if needed
        if (parseResult.warnings.readOnlyColumns.length > 0) {
          console.warn('[CSV Import] Read-only columns detected and ignored:', 
            parseResult.warnings.readOnlyColumns);
          
          toast({
            title: "Read-Only Columns Ignored",
            description: `${parseResult.warnings.readOnlyColumns.length} read-only column(s) skipped: ${parseResult.warnings.readOnlyColumns.join(', ')}`,
            variant: "default"
          });
        }
        
        if (parseResult.warnings.invalidColumns.length > 0) {
          toast({
            title: "Ignored Columns",
            description: `${parseResult.warnings.invalidColumns.length} column(s) not recognized: ${parseResult.warnings.invalidColumns.join(', ')}`,
            variant: "default"
          });
        }
        
        console.debug('[CSV Import] Sample parsed rows (first 2):');
        transformedData.slice(0, 2).forEach((row, idx) => {
          console.debug(`  Row ${idx}:`, row);
          console.debug(`  Row ${idx} keys:`, Object.keys(row));
        });
        
        setParsedData(transformedData);
      } else {
        // For contacts, use the old mapping system
        const { mapped, unmapped } = mapCsvHeaders(csvHeaders, columnMapResult.displayToColumn);
        console.debug('[CSV Import] Mapped columns:', Array.from(mapped.entries()));
        console.debug('[CSV Import] Unmapped columns:', unmapped);
        
        setColumnMappings(mapped);
        setUnmappedColumns(unmapped);
        
        // Add row numbers for validation tracking
        const dataWithRowNumbers = data.map((row, idx) => ({
          ...row,
          _rowNumber: idx + (hasHeaderRow ? 2 : 1)
        }));

        // Transform to use database column names
        const transformedData = transformCsvData(dataWithRowNumbers, mapped);
        console.debug('[CSV Import] Sample transformed rows (first 2):');
        transformedData.slice(0, 2).forEach((row, idx) => {
          console.debug(`  Row ${idx}:`, row);
          console.debug(`  Row ${idx} keys:`, Object.keys(row));
        });
        
        if (unmapped.length > 0) {
          toast({
            title: "Unmapped Columns",
            description: `${unmapped.length} columns not recognized: ${unmapped.join(', ')}`,
            variant: "default"
          });
        }
        
        setParsedData(transformedData);
      }

      // SIMPLIFIED CLASSIFICATION: No validation, just partition by ID presence
      console.debug('[CSV Import] Starting simplified classification strategy');
      
      let rowsForUpdate: any[] = [];
      let rowsForInsert: any[] = [];
      const skippedRows: any[] = [];
      
      if (entityType === 'opportunities') {
        // Simple classification: no validation, just partition by ID/deal_name presence
        parsedData.forEach(row => {
          if (row.id && String(row.id).trim() !== '') {
            row.__intent = 'update';
            row.__matchType = 'has-id';
            rowsForUpdate.push(row);
          } else if (row.deal_name && String(row.deal_name).trim() !== '') {
            row.__intent = 'insert';
            row.__matchType = 'new-record';
            rowsForInsert.push(row);
          } else {
            // Skip rows with neither ID nor deal_name
            row.__intent = 'skip';
            row.__matchType = 'invalid';
            skippedRows.push(row);
          }
        });
        
        console.debug(`[CSV Import] Opportunities classified: ${rowsForUpdate.length} updates, ${rowsForInsert.length} inserts, ${skippedRows.length} skipped`);
        
        // All rows are considered "valid" except those marked to skip
        const validRows = parsedData.filter(row => row.__intent !== 'skip');
        
        setValidationResults({
          valid: validRows,
          invalid: [],
          warnings: skippedRows.map((row, idx) => ({
            row: row._rowNumber || (idx + 2),
            message: '⚠️ Row has no ID and no deal_name - will be skipped'
          }))
        });
        
        // Show summary toast
        const summary = [
          rowsForUpdate.length > 0 ? `${rowsForUpdate.length} potential updates` : null,
          rowsForInsert.length > 0 ? `${rowsForInsert.length} potential inserts` : null
        ].filter(Boolean).join(', ');
        
        toast({
          title: "File Parsed - Simple Import",
          description: `Found ${parsedData.length} rows: ${summary}. ${validRows.length} valid, ${skippedRows.length} skipped.`,
        });
      } else {
        // Contacts: partition by ID presence and use dynamic validation
        parsedData.forEach(row => {
          if (row.id) {
            row.__intent = 'update';
            rowsForUpdate.push(row);
          } else {
            row.__intent = 'insert';
            rowsForInsert.push(row);
          }
        });
        
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
          description: `Found ${parsedData.length} rows: ${summary}. ${mergedValidation.valid.length} valid, ${mergedValidation.invalid.length} with errors.`,
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
      const errorMessage = entityType === 'opportunities' 
        ? 'No valid rows found. Each row needs either an ID (for updates) or a deal_name (for new opportunities).'
        : 'No valid rows found. Please check your CSV file and column mappings.';
      
      setImportResults({
        total: totalRows,
        successful: 0,
        failed: totalRows,
        errors: validationErrors.length > 0 ? validationErrors : [
          { row: 0, error: errorMessage }
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
    const startTime = Date.now();

    let successful = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string; data?: any }> = [...validationErrors];

    // Partition valid rows by intent
    const rowsToUpsert = validRows.filter(row => row.__intent === 'update');
    const rowsToInsert = validRows.filter(row => row.__intent === 'insert');
    
    console.debug(`[CSV Import] Executing: ${rowsToUpsert.length} upserts, ${rowsToInsert.length} inserts`);

    try {
      setProgress(10);
      
      // Clean rows: remove tracking fields and apply field whitelisting
      const cleanRows = (rows: any[]) => {
        return rows.map(row => {
          // Remove internal tracking fields
          const { __intent, __matchType, _rowNumber, ...cleanRow } = row;
          
          // For opportunities, also remove read-only columns
          // Note: 'id' is not in READ_ONLY_OPPORTUNITY_COLUMNS, so it's safe to keep
          if (entityType === 'opportunities') {
            READ_ONLY_OPPORTUNITY_COLUMNS.forEach(col => {
              delete cleanRow[col];
            });
          }
          
          // Apply whitelist for safe database operations
          return cleanRowForDatabase(cleanRow, tableName as 'contacts_raw' | 'opportunities_raw');
        });
      };

      let updatedCount = 0;
      let insertedCount = 0;

      // PHASE 1: Upsert rows with IDs
      if (rowsToUpsert.length > 0) {
        setProgress(30);
        const cleanedUpserts = cleanRows(sanitizeImportBatch(rowsToUpsert));
        
        console.debug(`[CSV Import] Upserting ${cleanedUpserts.length} rows, sample:`, cleanedUpserts[0]);

        const { error: upsertError } = await supabase
          .from(tableName)
          .upsert(cleanedUpserts, { onConflict: 'id' });

        if (upsertError) {
          const parsedError = parseSupabaseError(upsertError, {
            operation: 'CSV upsert',
            table: tableName
          });
          console.error('[CSV Import] Upsert failed:', parsedError);
          
          setImportResults({
            total: parsedData.length,
            successful: 0,
            failed: parsedData.length,
            errors: [{
              row: 0,
              error: `❌ Upsert Error: ${upsertError.message}${upsertError.details ? ` | Details: ${upsertError.details}` : ''}${upsertError.hint ? ` | Hint: ${upsertError.hint}` : ''}`
            }]
          });
          
          toast({
            title: "Import Failed",
            description: upsertError.message,
            variant: "destructive"
          });
          return;
        }
        
        updatedCount = cleanedUpserts.length;
        successful += updatedCount;
        console.debug(`[CSV Import] Upserted ${updatedCount} rows successfully`);
      }

      // PHASE 2: Insert new rows
      if (rowsToInsert.length > 0) {
        setProgress(70);
        
        // Deduplicate within CSV by deal_name/email
        const seenKeys = new Set<string>();
        const deduplicated = rowsToInsert.filter(row => {
          const key = entityType === 'opportunities' ? row.deal_name : row.email_address;
          if (!key || seenKeys.has(key)) {
            skipped++;
            return false;
          }
          seenKeys.add(key);
          return true;
        });
        
        const cleanedInserts = cleanRows(sanitizeImportBatch(deduplicated));
        
        console.debug(`[CSV Import] Inserting ${cleanedInserts.length} rows, sample:`, cleanedInserts[0]);

        const { error: insertError } = await supabase
          .from(tableName)
          .insert(cleanedInserts);

        if (insertError) {
          const parsedError = parseSupabaseError(insertError, {
            operation: 'CSV insert',
            table: tableName
          });
          console.error('[CSV Import] Insert failed:', parsedError);
          
          setImportResults({
            total: parsedData.length,
            successful: updatedCount,
            failed: parsedData.length - updatedCount,
            errors: [{
              row: 0,
              error: `❌ Insert Error: ${insertError.message}${insertError.details ? ` | Details: ${insertError.details}` : ''}${insertError.hint ? ` | Hint: ${insertError.hint}` : ''}`
            }]
          });
          
          toast({
            title: "Import Partially Failed",
            description: `${updatedCount} rows updated, but insert failed: ${insertError.message}`,
            variant: "destructive"
          });
          return;
        }
        
        insertedCount = cleanedInserts.length;
        successful += insertedCount;
        console.debug(`[CSV Import] Inserted ${insertedCount} rows successfully`);
      }

      setProgress(100);
      const endTime = Date.now();
      
      // Calculate totals
      const totalRows = parsedData.length;
      const failedValidation = validationErrors.length;
      
      setImportResults({
        total: totalRows,
        successful,
        failed: failedValidation,
        skipped,
        errors: validationErrors,
        startTime,
        endTime
      });

      // Build clear summary message
      const messages = [
        updatedCount > 0 ? `Updated ${updatedCount}` : null,
        insertedCount > 0 ? `Inserted ${insertedCount}` : null,
        skipped > 0 ? `Skipped ${skipped} duplicates` : null,
        failedValidation > 0 ? `${failedValidation} validation errors` : null
      ].filter(Boolean);

      toast({
        title: "Import Completed",
        description: messages.length > 0 ? messages.join(' • ') : 'All rows processed successfully',
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
        endTime
      });
      
      toast({
        title: "Import Failed",
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
    hasHeaderRow,
    setHasHeaderRow,
    updatePreview,
    columnMappings,
    unmappedColumns,
    dbRecordsCache,
    parseFile,
    executeImport,
    reset
  };
}
