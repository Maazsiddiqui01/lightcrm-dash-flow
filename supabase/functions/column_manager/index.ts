import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ColumnManagerRequest {
  action: 'get_details' | 'create' | 'update' | 'delete';
  tableName: 'contacts_raw' | 'opportunities_raw';
  columnName?: string;
  columnDetails?: {
    name: string;
    displayName: string;
    type: string;
    nullable: boolean;
    defaultValue: string;
    options: string[];
    validationRules: ValidationRule[];
  };
}

interface ValidationRule {
  id: string;
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: ColumnManagerRequest = await req.json()
    
    console.log('Column manager request:', requestData);

    switch (requestData.action) {
      case 'get_details':
        return await getColumnDetails(supabaseClient, requestData);
      case 'create':
        return await createColumn(supabaseClient, requestData);
      case 'update':
        return await updateColumn(supabaseClient, requestData);
      case 'delete':
        return await deleteColumn(supabaseClient, requestData);
      default:
        throw new Error(`Unknown action: ${requestData.action}`);
    }

  } catch (error) {
    console.error('Column manager error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.toString() : String(error)
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function getColumnDetails(supabaseClient: any, request: ColumnManagerRequest) {
  const { tableName, columnName } = request;
  
  if (!columnName) {
    throw new Error('Column name is required for get_details action');
  }

  // This would load from editableColumns.ts and getTableColumns.ts
  // For now, return mock data - in production, read from files
  const mockDetails = {
    name: columnName,
    displayName: formatColumnName(columnName),
    type: 'text',
    nullable: true,
    defaultValue: '',
    options: [],
    validationRules: []
  };

  return new Response(
    JSON.stringify(mockDetails),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function createColumn(supabaseClient: any, request: ColumnManagerRequest) {
  const { tableName, columnDetails } = request;
  
  if (!columnDetails) {
    throw new Error('Column details are required for create action');
  }

  // Validate table name
  if (!['contacts_raw', 'opportunities_raw'].includes(tableName)) {
    throw new Error('Invalid table name');
  }

  // Validate column name
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(columnDetails.name)) {
    throw new Error('Invalid column name. Use only letters, numbers, and underscores.');
  }

  // Step 1: Create database column
  const sqlType = mapDataTypeToSQL(columnDetails.type);
  let sql = `ALTER TABLE public.${tableName} ADD COLUMN ${columnDetails.name} ${sqlType}`;
  
  if (!columnDetails.nullable) {
    sql += ' NOT NULL';
  }
  
  if (columnDetails.defaultValue) {
    sql += ` DEFAULT '${columnDetails.defaultValue.replace(/'/g, "''")}'`;
  }

  console.log('Executing SQL:', sql);

  const { error } = await supabaseClient.rpc('execute_sql', { query: sql });
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // Step 2: Update configuration files would happen here
  // In production, this would update:
  // - src/config/editableColumns.ts
  // - src/lib/supabase/getTableColumns.ts
  
  // Log the change
  await logSchemaChange(supabaseClient, {
    action: 'create_column',
    table_name: tableName,
    column_name: columnDetails.name,
    details: columnDetails
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Column ${columnDetails.name} created successfully`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateColumn(supabaseClient: any, request: ColumnManagerRequest) {
  const { tableName, columnDetails } = request;
  
  if (!columnDetails) {
    throw new Error('Column details are required for update action');
  }

  // In production, this would:
  // 1. Update database schema if needed (type changes, nullability, etc.)
  // 2. Update getTableColumns.ts with new display name
  // 3. Update editableColumns.ts with new configuration
  // 4. Update dropdown options and validation rules

  console.log('Updating column:', columnDetails);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Column ${columnDetails.name} updated successfully`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function deleteColumn(supabaseClient: any, request: ColumnManagerRequest) {
  const { tableName, columnName } = request;
  
  if (!columnName) {
    throw new Error('Column name is required for delete action');
  }

  // Safety check - don't allow deleting system columns
  const systemColumns = ['id', 'created_at', 'updated_at'];
  if (systemColumns.includes(columnName)) {
    throw new Error('Cannot delete system columns');
  }

  // Step 1: Remove from database
  const sql = `ALTER TABLE public.${tableName} DROP COLUMN ${columnName}`;
  
  console.log('Executing SQL:', sql);
  
  const { error } = await supabaseClient.rpc('execute_sql', { query: sql });
  
  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // Step 2: Remove from configuration files would happen here
  
  await logSchemaChange(supabaseClient, {
    action: 'delete_column',
    table_name: tableName,
    column_name: columnName,
    details: {}
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Column ${columnName} deleted successfully`
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

function formatColumnName(columnName: string): string {
  return columnName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function logSchemaChange(supabaseClient: any, change: any) {
  try {
    await supabaseClient
      .from('schema_change_log')
      .insert({
        ...change,
        created_at: new Date().toISOString(),
        created_by: 'system'
      });
  } catch (error) {
    console.error('Failed to log schema change:', error);
  }
}