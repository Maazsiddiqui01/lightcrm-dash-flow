/**
 * View Synchronization Validator
 * 
 * Validates that database views contain all necessary columns from their base tables.
 * Prevents "Failed to fetch" errors caused by missing columns in views.
 */

import { supabase } from '@/integrations/supabase/client';
import { VIEW_DEPENDENCIES, getFilterableColumns, getExcludedColumns } from './viewDependencies';

interface ViewSyncIssue {
  severity: 'error' | 'warning';
  baseTable: string;
  viewName: string;
  missingColumn: string;
  message: string;
  recommendation: string;
}

interface ViewSyncResult {
  valid: boolean;
  issues: ViewSyncIssue[];
  summary: {
    totalViews: number;
    viewsChecked: number;
    missingColumns: number;
  };
}

/**
 * Get columns from a table or view
 */
async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_table_columns' as any, {
      p_table_name: tableName
    });
    
    if (error) {
      console.error(`Error fetching columns for ${tableName}:`, error);
      return [];
    }
    
    // Type assertion since this is a new RPC function
    return (data as string[]) || [];
  } catch (err) {
    console.error(`Failed to get columns for ${tableName}:`, err);
    return [];
  }
}

/**
 * Validate that all required columns from base table exist in dependent views
 */
export async function validateViewColumnSync(): Promise<ViewSyncResult> {
  const issues: ViewSyncIssue[] = [];
  let totalViews = 0;
  let viewsChecked = 0;

  for (const [baseTable, config] of Object.entries(VIEW_DEPENDENCIES)) {
    const filterableColumns = getFilterableColumns(baseTable);
    const excludedColumns = getExcludedColumns(baseTable);
    
    for (const viewName of config.views) {
      totalViews++;
      
      // Get columns from base table and view
      const baseColumns = await getTableColumns(baseTable);
      const viewColumns = await getTableColumns(viewName);
      
      if (baseColumns.length === 0 || viewColumns.length === 0) {
        issues.push({
          severity: 'error',
          baseTable,
          viewName,
          missingColumn: 'N/A',
          message: `Could not fetch columns for ${baseTable} or ${viewName}`,
          recommendation: 'Ensure the RPC function get_table_columns exists and works correctly'
        });
        continue;
      }
      
      viewsChecked++;
      
      // Check each filterable column from base table
      for (const column of filterableColumns) {
        // Skip if this column is excluded (computed fields)
        if (excludedColumns.includes(column)) {
          continue;
        }
        
        // Check if column exists in base table
        if (!baseColumns.includes(column)) {
          issues.push({
            severity: 'warning',
            baseTable,
            viewName,
            missingColumn: column,
            message: `Column "${column}" is marked as filterable but doesn't exist in ${baseTable}`,
            recommendation: `Remove "${column}" from filterableColumns in viewDependencies.ts or add it to ${baseTable}`
          });
          continue;
        }
        
        // Check if column exists in view
        if (!viewColumns.includes(column)) {
          issues.push({
            severity: 'error',
            baseTable,
            viewName,
            missingColumn: column,
            message: `Column "${column}" exists in ${baseTable} but is missing from ${viewName}`,
            recommendation: `Add "${column}" to the ${viewName} view definition using a database migration`
          });
        }
      }
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    summary: {
      totalViews,
      viewsChecked,
      missingColumns: issues.filter(i => i.severity === 'error').length
    }
  };
}

/**
 * Generate a report of view synchronization issues
 */
export function formatViewSyncReport(result: ViewSyncResult): string {
  const { valid, issues, summary } = result;
  
  let report = '🔍 View-Table Synchronization Report\n\n';
  report += `Views Checked: ${summary.viewsChecked}/${summary.totalViews}\n`;
  report += `Missing Columns: ${summary.missingColumns}\n`;
  report += `Status: ${valid ? '✅ VALID' : '❌ ISSUES FOUND'}\n\n`;
  
  if (issues.length > 0) {
    report += 'Issues:\n\n';
    issues.forEach((issue, index) => {
      const emoji = issue.severity === 'error' ? '❌' : '⚠️';
      report += `${index + 1}. ${emoji} ${issue.baseTable} → ${issue.viewName}\n`;
      report += `   Column: ${issue.missingColumn}\n`;
      report += `   ${issue.message}\n`;
      report += `   💡 ${issue.recommendation}\n\n`;
    });
  }
  
  return report;
}
