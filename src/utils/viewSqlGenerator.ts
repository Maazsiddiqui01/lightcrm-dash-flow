/**
 * View SQL Generator
 * 
 * Generates SQL for recreating views with all columns from base tables.
 * Helps maintain view-table synchronization when columns are added.
 */

import { supabase } from '@/integrations/supabase/client';
import { getFilterableColumns, getExcludedColumns, VIEW_DEPENDENCIES } from './viewDependencies';

interface ViewDefinition {
  viewName: string;
  baseTable: string;
  columns: string[];
  computedColumns?: ComputedColumn[];
}

interface ComputedColumn {
  name: string;
  definition: string;
}

/**
 * Known computed columns for specific views
 */
const COMPUTED_COLUMNS: Record<string, ComputedColumn[]> = {
  opportunities_with_display_fields: [
    {
      name: 'next_steps_display',
      definition: `COALESCE(NULLIF(TRIM(BOTH FROM next_steps), ''), 
        (SELECT content FROM opportunity_notes_timeline 
         WHERE opportunity_id = o.id AND field = 'next_steps' 
         ORDER BY created_at DESC LIMIT 1)
    )`
    },
    {
      name: 'notes_display',
      definition: `COALESCE(NULLIF(TRIM(BOTH FROM most_recent_notes), ''), 
        (SELECT content FROM opportunity_notes_timeline 
         WHERE opportunity_id = o.id AND field = 'most_recent_notes' 
         ORDER BY created_at DESC LIMIT 1)
    )`
    },
    {
      name: 'next_steps_due_date_display',
      definition: `COALESCE(next_steps_due_date, 
        (SELECT due_date FROM opportunity_notes_timeline 
         WHERE opportunity_id = o.id AND field = 'next_steps' 
         ORDER BY created_at DESC LIMIT 1)
    )`
    }
  ],
  contacts_with_display_fields: [
    {
      name: 'notes_display',
      definition: `COALESCE(NULLIF(TRIM(BOTH FROM notes), ''), 
        (SELECT content FROM contact_note_events 
         WHERE contact_id = c.id AND field = 'notes' 
         ORDER BY created_at DESC LIMIT 1)
    )`
    },
    {
      name: 'next_steps_display',
      definition: `COALESCE(NULLIF(TRIM(BOTH FROM next_steps), ''), 
        (SELECT content FROM contact_note_events 
         WHERE contact_id = c.id AND field = 'next_steps' 
         ORDER BY created_at DESC LIMIT 1)
    )`
    }
  ]
};

/**
 * Get all columns from a table
 */
async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_table_columns' as any, {
      p_table_name: tableName
    });
    
    if (error) throw error;
    // Type assertion since this is a new RPC function
    return (data as string[]) || [];
  } catch (err) {
    console.error(`Failed to get columns for ${tableName}:`, err);
    return [];
  }
}

/**
 * Generate SQL to recreate a view with all columns from base table
 */
export async function generateViewUpdateSQL(
  viewName: string,
  baseTable: string
): Promise<string> {
  // Get all columns from base table
  const baseColumns = await getTableColumns(baseTable);
  
  if (baseColumns.length === 0) {
    throw new Error(`Could not fetch columns for ${baseTable}`);
  }
  
  // Get filterable columns to ensure they're included
  const filterableColumns = getFilterableColumns(baseTable);
  
  // Get excluded columns (computed fields)
  const excludedColumns = getExcludedColumns(baseTable);
  
  // Start with all base table columns, excluding computed ones
  const columns = baseColumns.filter(col => !excludedColumns.includes(col));
  
  // Add any filterable columns that might be missing
  filterableColumns.forEach(col => {
    if (!columns.includes(col) && !excludedColumns.includes(col)) {
      columns.push(col);
    }
  });
  
  // Get computed columns for this view
  const computedColumns = COMPUTED_COLUMNS[viewName] || [];
  
  // Generate SQL
  let sql = `-- Recreate ${viewName} with all columns from ${baseTable}\n`;
  sql += `DROP VIEW IF EXISTS ${viewName};\n\n`;
  sql += `CREATE VIEW ${viewName} AS\n`;
  sql += `SELECT \n`;
  
  // Add base columns
  sql += `    ${columns.join(',\n    ')}`;
  
  // Add computed columns if any
  if (computedColumns.length > 0) {
    sql += ',\n';
    sql += computedColumns.map(col => 
      `    ${col.definition} AS ${col.name}`
    ).join(',\n');
  }
  
  // Determine table alias
  const alias = baseTable.includes('opportunities') ? 'o' : 'c';
  
  sql += `\nFROM ${baseTable} ${alias};\n`;
  
  return sql;
}

/**
 * Generate SQL for all views that depend on a given base table
 */
export async function generateAllViewsSQL(baseTable: string): Promise<string> {
  const dependency = VIEW_DEPENDENCIES[baseTable];
  
  if (!dependency) {
    throw new Error(`No view dependencies found for ${baseTable}`);
  }
  
  let sql = `-- Update all views for ${baseTable}\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;
  
  for (const viewName of dependency.views) {
    const viewSql = await generateViewUpdateSQL(viewName, baseTable);
    sql += viewSql + '\n\n';
  }
  
  return sql;
}

/**
 * Log generated SQL to console for easy copying
 */
export async function logViewUpdateSQL(baseTable: string): Promise<void> {
  console.group(`📝 Generated SQL for ${baseTable} views`);
  
  try {
    const sql = await generateAllViewsSQL(baseTable);
    console.log(sql);
    console.log('\n💡 Copy the SQL above and create a new migration file');
  } catch (err) {
    console.error('Failed to generate SQL:', err);
  }
  
  console.groupEnd();
}
