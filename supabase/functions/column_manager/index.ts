import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const body = await req.json();
    const { action, tableName, columnDetails, columnName, table_name, column_name, display_name, data_type, nullable, default_value, new_column_name } = body;

    console.log('Column manager action:', action, 'for table:', tableName || table_name, 'column:', columnName || column_name);

    if (action === 'create') {
      // Validate column name (no spaces, special chars)
      if (!/^[a-z_][a-z0-9_]*$/.test(columnDetails.name)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid column name. Use lowercase letters, numbers, and underscores only. Must start with a letter or underscore.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if column already exists
      const { data: existingCols } = await supabaseClient
        .from('column_configurations')
        .select('column_name')
        .eq('table_name', tableName)
        .eq('column_name', columnDetails.name);

      if (existingCols && existingCols.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Column already exists' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Create the actual column in the database
      const sql = `ALTER TABLE public.${tableName} ADD COLUMN IF NOT EXISTS ${columnDetails.name} ${mapDataTypeToSQL(columnDetails.type)}${columnDetails.nullable ? '' : ' NOT NULL'}${columnDetails.defaultValue ? ` DEFAULT '${columnDetails.defaultValue}'` : ''}`;
      
      const { data: sqlResult, error: sqlError } = await supabaseClient.rpc('execute_admin_sql', {
        sql_statement: sql
      });

      if (sqlError) {
        console.error('SQL execution error:', sqlError);
        throw sqlError;
      }

      // Add configuration entry
      const { error: configError } = await supabaseClient
        .from('column_configurations')
        .insert({
          table_name: tableName,
          column_name: columnDetails.name,
          display_name: columnDetails.displayName || columnDetails.name,
          field_type: columnDetails.type,
          is_editable: true,
          is_required: !columnDetails.nullable
        });

      if (configError) {
        console.error('Config insert error:', configError);
        throw configError;
      }

      // Log the change
      await supabaseClient
        .from('schema_change_log')
        .insert({
          table_name: tableName,
          operation: 'ADD_COLUMN',
          column_name: columnDetails.name,
          new_value: `${columnDetails.type}${columnDetails.nullable ? '' : ' NOT NULL'}`,
          success: true
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Column created successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      // Check if column is protected
      const { data: isProtected } = await supabaseClient.rpc('is_column_protected', {
        p_table: tableName,
        p_column: columnName
      });

      if (isProtected) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete protected column' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      // Remove the actual column from the database
      const sql = `ALTER TABLE public.${tableName} DROP COLUMN IF EXISTS ${columnName}`;
      
      const { error: sqlError } = await supabaseClient.rpc('execute_admin_sql', {
        sql_statement: sql
      });

      if (sqlError) throw sqlError;

      // Remove configuration entry
      await supabaseClient
        .from('column_configurations')
        .delete()
        .eq('table_name', tableName)
        .eq('column_name', columnName);

      // Log the change
      await supabaseClient
        .from('schema_change_log')
        .insert({
          table_name: tableName,
          operation: 'DROP_COLUMN',
          column_name: columnName,
          success: true
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Column deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_type') {
      // Validate data type change before applying
      const { data: validation, error: validationError } = await supabaseClient.rpc('validate_column_type_change', {
        p_table: tableName,
        p_column: columnName,
        p_new_type: mapDataTypeToSQL(data_type)
      });

      if (validationError || !validation?.valid) {
        const errorMsg = validation?.error || validationError?.message || 'Data type change validation failed';
        console.error('Type change validation failed:', errorMsg);
        return new Response(
          JSON.stringify({ 
            error: `Cannot change column type: ${errorMsg}`,
            details: 'Some existing data cannot be converted to the new type. Please clean the data first or choose a compatible type.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Apply the type change
      const sql = `ALTER TABLE public.${tableName} ALTER COLUMN ${columnName} TYPE ${mapDataTypeToSQL(data_type)} USING ${columnName}::${mapDataTypeToSQL(data_type)}`;
      
      const { error: sqlError } = await supabaseClient.rpc('execute_admin_sql', {
        sql_statement: sql
      });

      if (sqlError) {
        console.error('Type change SQL error:', sqlError);
        throw new Error(`Failed to change column type: ${sqlError.message}`);
      }

      // Update configuration
      await supabaseClient
        .from('column_configurations')
        .update({
          field_type: data_type,
          updated_at: new Date().toISOString()
        })
        .eq('table_name', tableName)
        .eq('column_name', columnName);

      // Log the change
      await supabaseClient
        .from('schema_change_log')
        .insert({
          table_name: tableName,
          operation: 'ALTER_COLUMN_TYPE',
          column_name: columnName,
          old_value: validation.old_type,
          new_value: mapDataTypeToSQL(data_type),
          success: true
        });

      return new Response(
        JSON.stringify({ success: true, message: `Column type changed successfully. ${validation.message || ''}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'rename') {
      // Rename the actual column in the database
      const sql = `ALTER TABLE public.${tableName} RENAME COLUMN ${columnName} TO ${new_column_name}`;
      
      const { error: sqlError } = await supabaseClient.rpc('execute_admin_sql', {
        sql_statement: sql
      });

      if (sqlError) {
        console.error('Rename SQL error:', sqlError);
        throw new Error(`Failed to rename column: ${sqlError.message}`);
      }

      // Update configuration entry
      await supabaseClient
        .from('column_configurations')
        .update({
          column_name: new_column_name,
          updated_at: new Date().toISOString()
        })
        .eq('table_name', tableName)
        .eq('column_name', columnName);

      // Log the change
      await supabaseClient
        .from('schema_change_log')
        .insert({
          table_name: tableName,
          operation: 'RENAME_COLUMN',
          column_name: columnName,
          old_value: columnName,
          new_value: new_column_name,
          success: true
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Column renamed successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Column manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapDataTypeToSQL(frontendType: string): string {
  const typeMap: Record<string, string> = {
    'text': 'TEXT',
    'email': 'TEXT',
    'number': 'NUMERIC',
    'integer': 'INTEGER',
    'boolean': 'BOOLEAN',
    'date': 'DATE',
    'timestamp': 'TIMESTAMP WITH TIME ZONE',
    'textarea': 'TEXT',
    'select': 'TEXT'
  };
  return typeMap[frontendType] || 'TEXT';
}