import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify authentication and check if admin
async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Invalid authentication');
  }

  // Check if user is admin (schema operations should be admin-only)
  const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
  if (!isAdmin) {
    throw new Error('Admin access required');
  }

  return { user, supabase };
}

interface ColumnOperation {
  action: 'add' | 'edit' | 'delete' | 'rename';
  tableName: string;
  columnName: string;
  newColumnName?: string;
  dataType?: string;
  isNullable?: boolean;
  defaultValue?: string;
  options?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication - Admin only for schema operations
    const { user } = await verifyAuth(req);
    console.log(`Admin user authenticated: ${user.id}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { operation }: { operation: ColumnOperation } = await req.json()
    
    console.log('Schema manager operation:', operation);

    switch (operation.action) {
      case 'add':
        return await addColumn(supabaseClient, operation);
      case 'edit':
        return await editColumn(supabaseClient, operation);
      case 'delete':
        return await deleteColumn(supabaseClient, operation);
      case 'rename':
        return await renameColumn(supabaseClient, operation);
      default:
        throw new Error(`Unknown operation: ${operation.action}`);
    }

  } catch (error) {
    console.error('Schema manager error:', error);
    
    // Return 401 for authentication errors, 403 for authorization errors
    if (error.message?.includes('authorization') || error.message?.includes('authentication')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (error.message?.includes('Admin access required')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function addColumn(supabaseClient: any, operation: ColumnOperation) {
  const { tableName, columnName, dataType, isNullable, defaultValue } = operation;
  
  // Validate inputs
  if (!tableName || !columnName || !dataType) {
    throw new Error('Missing required fields: tableName, columnName, dataType');
  }

  // Validate table name (security check)
  if (!['contacts_raw', 'opportunities_raw'].includes(tableName)) {
    throw new Error('Invalid table name. Only contacts_raw and opportunities_raw are allowed.');
  }

  // Validate column name (basic SQL injection prevention)
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(columnName)) {
    throw new Error('Invalid column name. Use only letters, numbers, and underscores.');
  }

  // Map frontend types to SQL types
  const sqlType = mapDataTypeToSQL(dataType);
  
  // Build ALTER TABLE statement
  let sql = `ALTER TABLE public.${tableName} ADD COLUMN ${columnName} ${sqlType}`;
  
  if (!isNullable) {
    sql += ' NOT NULL';
  }
  
  if (defaultValue) {
    sql += ` DEFAULT '${defaultValue.replace(/'/g, "''")}'`; // Basic SQL escape
  }

  console.log('Executing SQL:', sql);

  // Execute the migration
  const { error } = await supabaseClient.rpc('execute_sql', { query: sql });
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // Log the change for audit trail
  await logSchemaChange(supabaseClient, {
    action: 'add_column',
    table_name: tableName,
    column_name: columnName,
    details: { dataType, isNullable, defaultValue }
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Column ${columnName} added to ${tableName}`,
      sql: sql
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function editColumn(supabaseClient: any, operation: ColumnOperation) {
  // For safety, editing columns is limited to certain operations
  const { tableName, columnName, dataType } = operation;
  
  // Validate inputs
  if (!tableName || !columnName) {
    throw new Error('Missing required fields');
  }

  // For now, only allow changing column types (with careful validation)
  if (dataType) {
    const sqlType = mapDataTypeToSQL(dataType);
    const sql = `ALTER TABLE public.${tableName} ALTER COLUMN ${columnName} TYPE ${sqlType}`;
    
    console.log('Executing SQL:', sql);
    
    const { error } = await supabaseClient.rpc('execute_sql', { query: sql });
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    await logSchemaChange(supabaseClient, {
      action: 'edit_column',
      table_name: tableName,
      column_name: columnName,
      details: { newDataType: dataType }
    });
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Column ${columnName} updated in ${tableName}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function deleteColumn(supabaseClient: any, operation: ColumnOperation) {
  const { tableName, columnName } = operation;
  
  // Extra safety check - don't allow deleting system columns
  const systemColumns = ['id', 'created_at', 'updated_at'];
  if (systemColumns.includes(columnName)) {
    throw new Error('Cannot delete system columns');
  }

  const sql = `ALTER TABLE public.${tableName} DROP COLUMN ${columnName}`;
  
  console.log('Executing SQL:', sql);
  
  const { error } = await supabaseClient.rpc('execute_sql', { query: sql });
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  await logSchemaChange(supabaseClient, {
    action: 'delete_column',
    table_name: tableName,
    column_name: columnName,
    details: {}
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Column ${columnName} deleted from ${tableName}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function renameColumn(supabaseClient: any, operation: ColumnOperation) {
  const { tableName, columnName, newColumnName } = operation;
  
  if (!newColumnName) {
    throw new Error('New column name is required');
  }

  // Validate new column name
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(newColumnName)) {
    throw new Error('Invalid new column name');
  }

  const sql = `ALTER TABLE public.${tableName} RENAME COLUMN ${columnName} TO ${newColumnName}`;
  
  console.log('Executing SQL:', sql);
  
  const { error } = await supabaseClient.rpc('execute_sql', { query: sql });
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  await logSchemaChange(supabaseClient, {
    action: 'rename_column',
    table_name: tableName,
    column_name: columnName,
    details: { newColumnName }
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Column ${columnName} renamed to ${newColumnName} in ${tableName}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function mapDataTypeToSQL(frontendType: string): string {
  switch (frontendType) {
    case 'text':
    case 'email':
    case 'select':
      return 'TEXT';
    case 'textarea':
      return 'TEXT';
    case 'number':
      return 'NUMERIC';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'timestamp':
      return 'TIMESTAMP WITH TIME ZONE';
    default:
      return 'TEXT';
  }
}

async function logSchemaChange(supabaseClient: any, change: any) {
  try {
    // Insert into audit log table (create this table if it doesn't exist)
    await supabaseClient
      .from('schema_change_log')
      .insert({
        ...change,
        created_at: new Date().toISOString(),
        created_by: 'system' // In real implementation, get from auth
      });
  } catch (error) {
    console.error('Failed to log schema change:', error);
    // Don't fail the main operation if logging fails
  }
}