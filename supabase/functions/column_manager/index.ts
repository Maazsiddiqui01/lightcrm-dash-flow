import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnOperation {
  action: 'get_details' | 'create' | 'update' | 'delete' | 'rename';
  tableName: string;
  columnName?: string;
  newColumnName?: string;
  dataType?: string;
  isNullable?: boolean;
  defaultValue?: string;
  displayName?: string;
  isEditable?: boolean;
  isRequired?: boolean;
  validationRules?: any[];
  fieldType?: string;
}

// Allowed SQL types - whitelist for security
const ALLOWED_SQL_TYPES = [
  'TEXT', 'INTEGER', 'BIGINT', 'BOOLEAN', 'UUID', 
  'TIMESTAMP WITH TIME ZONE', 'DATE', 'JSONB', 'NUMERIC'
];

// Security: Validate identifier (table/column names) to prevent SQL injection
function validateIdentifier(name: string): boolean {
  // Only allow alphanumeric and underscores, must start with letter or underscore
  return /^[a-z_][a-z0-9_]*$/i.test(name);
}

// Security: Validate that table exists in public schema
async function validateTableExists(supabaseClient: any, tableName: string): Promise<boolean> {
  const { data } = await supabaseClient
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .single();
  
  return !!data;
}

// Security: Validate column exists in table
async function validateColumnExists(supabaseClient: any, tableName: string, columnName: string): Promise<boolean> {
  const { data } = await supabaseClient
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .eq('column_name', columnName)
    .single();
  
  return !!data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated and is admin
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id,
    });

    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const operation: ColumnOperation = await req.json();
    console.log('Column operation:', operation);

    let result;

    switch (operation.action) {
      case 'get_details':
        result = await getColumnDetails(supabaseClient, operation);
        break;
      case 'create':
        result = await createColumn(supabaseClient, operation);
        break;
      case 'update':
        result = await updateColumn(supabaseClient, operation);
        break;
      case 'delete':
        result = await deleteColumn(supabaseClient, operation);
        break;
      case 'rename':
        result = await renameColumn(supabaseClient, operation);
        break;
      default:
        throw new Error(`Unknown action: ${operation.action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Column manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' || error.message === 'Admin access required' ? 403 : 400,
      }
    );
  }
});

async function getColumnDetails(supabaseClient: any, operation: ColumnOperation) {
  // Get column info from information_schema
  const { data: columnInfo, error: columnError } = await supabaseClient
    .from('information_schema.columns')
    .select('*')
    .eq('table_schema', 'public')
    .eq('table_name', operation.tableName)
    .eq('column_name', operation.columnName)
    .single();

  if (columnError) throw columnError;

  // Get configuration from column_configurations if exists
  const { data: config } = await supabaseClient
    .from('column_configurations')
    .select('*')
    .eq('table_name', operation.tableName)
    .eq('column_name', operation.columnName)
    .single();

  return {
    ...columnInfo,
    configuration: config,
  };
}

async function createColumn(supabaseClient: any, operation: ColumnOperation) {
  const { tableName, columnName, dataType, isNullable, defaultValue } = operation;

  // Validate inputs
  if (!columnName || !dataType) {
    throw new Error('Column name and data type are required');
  }

  // SECURITY: Validate identifiers to prevent SQL injection
  if (!validateIdentifier(tableName)) {
    throw new Error('Invalid table name: must contain only letters, numbers, and underscores');
  }
  if (!validateIdentifier(columnName)) {
    throw new Error('Invalid column name: must contain only letters, numbers, and underscores');
  }

  // SECURITY: Verify table exists
  if (!(await validateTableExists(supabaseClient, tableName))) {
    throw new Error(`Table '${tableName}' does not exist`);
  }

  // Map data type to SQL type
  const sqlType = mapDataTypeToSQL(dataType);
  
  // SECURITY: Validate SQL type against whitelist
  if (!ALLOWED_SQL_TYPES.includes(sqlType)) {
    throw new Error(`Invalid SQL type '${sqlType}'. Allowed types: ${ALLOWED_SQL_TYPES.join(', ')}`);
  }

  const nullable = isNullable ? '' : 'NOT NULL';
  const defaultClause = defaultValue ? `DEFAULT ${defaultValue}` : '';

  // Create the column
  const alterSQL = `
    ALTER TABLE public.${tableName} 
    ADD COLUMN ${columnName} ${sqlType} ${nullable} ${defaultClause}
  `.trim();

  const { data: result, error } = await supabaseClient.rpc('execute_admin_sql', {
    sql_statement: alterSQL,
  });

  if (error) throw error;
  
  // FIX: Check result.success instead of assuming success
  if (!result || result.success === false) {
    throw new Error(result?.error || 'SQL execution failed');
  }

  // Create configuration entry
  const { error: configError } = await supabaseClient
    .from('column_configurations')
    .insert({
      table_name: tableName,
      column_name: columnName,
      field_type: dataType,
      display_name: operation.displayName || columnName,
      is_editable: operation.isEditable ?? true,
      is_required: operation.isRequired ?? !isNullable,
      validation_rules: operation.validationRules || [],
    });

  if (configError) {
    console.error('Failed to create column configuration:', configError);
  }

  // Log the change
  await logSchemaChange(supabaseClient, {
    action: 'create_column',
    table_name: tableName,
    column_name: columnName,
    details: { dataType, isNullable, defaultValue },
  });

  return { success: true, message: `Column ${columnName} created successfully` };
}

async function updateColumn(supabaseClient: any, operation: ColumnOperation) {
  const { tableName, columnName, dataType } = operation;

  if (!dataType) {
    throw new Error('Data type is required for update');
  }

  // SECURITY: Validate identifiers to prevent SQL injection
  if (!validateIdentifier(tableName)) {
    throw new Error('Invalid table name: must contain only letters, numbers, and underscores');
  }
  if (!validateIdentifier(columnName)) {
    throw new Error('Invalid column name: must contain only letters, numbers, and underscores');
  }

  // SECURITY: Verify table and column exist
  if (!(await validateTableExists(supabaseClient, tableName))) {
    throw new Error(`Table '${tableName}' does not exist`);
  }
  if (!(await validateColumnExists(supabaseClient, tableName, columnName))) {
    throw new Error(`Column '${columnName}' does not exist in table '${tableName}'`);
  }

  // Check if column is protected
  const { data: isProtected } = await supabaseClient
    .from('protected_columns')
    .select('reason')
    .eq('table_name', tableName)
    .eq('column_name', columnName)
    .single();

  if (isProtected) {
    throw new Error(`Cannot modify protected column: ${isProtected.reason}`);
  }

  const sqlType = mapDataTypeToSQL(dataType);

  // SECURITY: Validate SQL type against whitelist
  if (!ALLOWED_SQL_TYPES.includes(sqlType)) {
    throw new Error(`Invalid SQL type '${sqlType}'. Allowed types: ${ALLOWED_SQL_TYPES.join(', ')}`);
  }

  const alterSQL = `
    ALTER TABLE public.${tableName} 
    ALTER COLUMN ${columnName} TYPE ${sqlType}
  `;

  const { data: result, error } = await supabaseClient.rpc('execute_admin_sql', {
    sql_statement: alterSQL,
  });

  if (error) throw error;
  
  if (!result || result.success === false) {
    throw new Error(result?.error || 'SQL execution failed');
  }

  // Update configuration
  const { error: configError } = await supabaseClient
    .from('column_configurations')
    .update({
      field_type: dataType,
      display_name: operation.displayName,
      is_editable: operation.isEditable,
      is_required: operation.isRequired,
      validation_rules: operation.validationRules,
      updated_at: new Date().toISOString(),
    })
    .eq('table_name', tableName)
    .eq('column_name', columnName);

  if (configError) {
    console.error('Failed to update column configuration:', configError);
  }

  await logSchemaChange(supabaseClient, {
    action: 'update_column',
    table_name: tableName,
    column_name: columnName,
    details: { dataType },
  });

  return { success: true, message: `Column ${columnName} updated successfully` };
}

async function deleteColumn(supabaseClient: any, operation: ColumnOperation) {
  const { tableName, columnName } = operation;

  // SECURITY: Validate identifiers to prevent SQL injection
  if (!validateIdentifier(tableName)) {
    throw new Error('Invalid table name: must contain only letters, numbers, and underscores');
  }
  if (!validateIdentifier(columnName)) {
    throw new Error('Invalid column name: must contain only letters, numbers, and underscores');
  }

  // SECURITY: Verify table and column exist
  if (!(await validateTableExists(supabaseClient, tableName))) {
    throw new Error(`Table '${tableName}' does not exist`);
  }
  if (!(await validateColumnExists(supabaseClient, tableName, columnName))) {
    throw new Error(`Column '${columnName}' does not exist in table '${tableName}'`);
  }

  // Check if column is protected
  const { data: isProtected } = await supabaseClient
    .from('protected_columns')
    .select('reason')
    .eq('table_name', tableName)
    .eq('column_name', columnName)
    .single();

  if (isProtected) {
    throw new Error(`Cannot delete protected column: ${isProtected.reason}`);
  }

  const alterSQL = `ALTER TABLE public.${tableName} DROP COLUMN ${columnName}`;

  const { data: result, error } = await supabaseClient.rpc('execute_admin_sql', {
    sql_statement: alterSQL,
  });

  if (error) throw error;
  
  if (!result || result.success === false) {
    throw new Error(result?.error || 'SQL execution failed');
  }

  // Delete configuration
  await supabaseClient
    .from('column_configurations')
    .delete()
    .eq('table_name', tableName)
    .eq('column_name', columnName);

  await logSchemaChange(supabaseClient, {
    action: 'delete_column',
    table_name: tableName,
    column_name: columnName,
    details: {},
  });

  return { success: true, message: `Column ${columnName} deleted successfully` };
}

async function renameColumn(supabaseClient: any, operation: ColumnOperation) {
  const { tableName, columnName, newColumnName } = operation;

  if (!newColumnName) {
    throw new Error('New column name is required');
  }

  // SECURITY: Validate identifiers to prevent SQL injection
  if (!validateIdentifier(tableName)) {
    throw new Error('Invalid table name: must contain only letters, numbers, and underscores');
  }
  if (!validateIdentifier(columnName)) {
    throw new Error('Invalid column name: must contain only letters, numbers, and underscores');
  }
  if (!validateIdentifier(newColumnName)) {
    throw new Error('Invalid new column name: must contain only letters, numbers, and underscores');
  }

  // SECURITY: Verify table and column exist
  if (!(await validateTableExists(supabaseClient, tableName))) {
    throw new Error(`Table '${tableName}' does not exist`);
  }
  if (!(await validateColumnExists(supabaseClient, tableName, columnName))) {
    throw new Error(`Column '${columnName}' does not exist in table '${tableName}'`);
  }

  // Check if column is protected
  const { data: isProtected } = await supabaseClient
    .from('protected_columns')
    .select('reason')
    .eq('table_name', tableName)
    .eq('column_name', columnName)
    .single();

  if (isProtected) {
    throw new Error(`Cannot rename protected column: ${isProtected.reason}`);
  }

  const alterSQL = `
    ALTER TABLE public.${tableName} 
    RENAME COLUMN ${columnName} TO ${newColumnName}
  `;

  const { data: result, error } = await supabaseClient.rpc('execute_admin_sql', {
    sql_statement: alterSQL,
  });

  if (error) throw error;
  
  if (!result || result.success === false) {
    throw new Error(result?.error || 'SQL execution failed');
  }

  // Update configuration
  await supabaseClient
    .from('column_configurations')
    .update({
      column_name: newColumnName,
      updated_at: new Date().toISOString(),
    })
    .eq('table_name', tableName)
    .eq('column_name', columnName);

  await logSchemaChange(supabaseClient, {
    action: 'rename_column',
    table_name: tableName,
    column_name: columnName,
    details: { newColumnName },
  });

  return { success: true, message: `Column renamed to ${newColumnName} successfully` };
}

function mapDataTypeToSQL(frontendType: string): string {
  const typeMap: Record<string, string> = {
    text: 'TEXT',
    number: 'NUMERIC',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    date: 'DATE',
    datetime: 'TIMESTAMP WITH TIME ZONE',
    email: 'TEXT',
    phone: 'TEXT',
    url: 'TEXT',
    json: 'JSONB',
    uuid: 'UUID',
  };

  return typeMap[frontendType.toLowerCase()] || 'TEXT';
}

async function logSchemaChange(supabaseClient: any, change: any) {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  await supabaseClient.from('schema_change_log').insert({
    table_name: change.table_name,
    operation: change.action,
    column_name: change.column_name,
    new_value: JSON.stringify(change.details),
    performed_by: user?.id,
    performed_at: new Date().toISOString(),
    success: true
  });
}
