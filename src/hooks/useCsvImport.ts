import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { validateCsvData } from "@/utils/csvValidation";
import { normalizeCsvData, trackNormalizationChanges } from "@/utils/csvNormalization";
import { supabase } from "@/integrations/supabase/client";

export interface ValidationResults {
  valid: any[];
  invalid: Array<{ row: number; errors: string[] }>;
  warnings: Array<{ row: number; message: string }>;
  normalized: Array<{ row: number; field: string; original: string; corrected: string }>;
}

export interface ImportResults {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export function useCsvImport(entityType: 'contacts' | 'opportunities') {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const parseFile = async (file: File) => {
    try {
      setFile(file);
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      
      if (rows.length < 2) {
        toast({
          title: "Invalid File",
          description: "CSV file must contain headers and at least one data row",
          variant: "destructive"
        });
        return;
      }

      const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const data = rows.slice(1).map((row, idx) => {
        const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: any = { _rowNumber: idx + 2 }; // +2 because of header row and 0-index
        headers.forEach((header, i) => {
          obj[header] = values[i] || null;
        });
        return obj;
      });

      setParsedData(data);

      // Validate and normalize
      const normalized = normalizeCsvData(data, entityType);
      const normalizationChanges = trackNormalizationChanges(data, normalized);
      const validation = validateCsvData(normalized, entityType);
      
      // Add normalization changes to validation results
      validation.normalized = normalizationChanges;
      
      setValidationResults(validation);

      toast({
        title: "File Parsed",
        description: `Found ${data.length} rows. ${validation.valid.length} valid, ${validation.invalid.length} invalid.`,
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Parse Error",
        description: "Failed to parse CSV file. Please check the format.",
        variant: "destructive"
      });
    }
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

      setImportResults({
        total: validRows.length,
        successful,
        failed,
        errors
      });

      const messages = [
        `Successfully imported ${successful} ${entityType}`,
        skipped > 0 ? `Skipped ${skipped} duplicates` : null,
        failed > 0 ? `Failed ${failed}` : null
      ].filter(Boolean);

      toast({
        title: "Import Completed",
        description: messages.join(', '),
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "An unexpected error occurred during import",
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
  };

  return {
    file,
    parsedData,
    validationResults,
    importResults,
    progress,
    parseFile,
    executeImport,
    reset
  };
}
