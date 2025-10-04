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

    const { action, table_name, column_name, display_name, data_type, nullable, default_value } = await req.json();

    console.log('Column manager action:', action, 'for table:', table_name, 'column:', column_name);

    if (action === 'create') {
      // Create the actual column in the database
      const sql = `ALTER TABLE public.${table_name} ADD COLUMN IF NOT EXISTS ${column_name} ${mapDataTypeToSQL(data_type)}${nullable ? '' : ' NOT NULL'}${default_value ? ` DEFAULT '${default_value}'` : ''}`;
      
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
          table_name,
          column_name,
          display_name: display_name || column_name,
          field_type: data_type,
          is_editable: true,
          is_required: !nullable
        });

      if (configError) {
        console.error('Config insert error:', configError);
        throw configError;
      }

      // Log the change
      await supabaseClient
        .from('schema_change_log')
        .insert({
          table_name,
          operation: 'ADD_COLUMN',
          column_name,
          new_value: `${data_type}${nullable ? '' : ' NOT NULL'}`,
          success: true
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Column created successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      // Remove the actual column from the database
      const sql = `ALTER TABLE public.${table_name} DROP COLUMN IF EXISTS ${column_name}`;
      
      const { error: sqlError } = await supabaseClient.rpc('execute_admin_sql', {
        sql_statement: sql
      });

      if (sqlError) throw sqlError;

      // Remove configuration entry
      await supabaseClient
        .from('column_configurations')
        .delete()
        .eq('table_name', table_name)
        .eq('column_name', column_name);

      // Log the change
      await supabaseClient
        .from('schema_change_log')
        .insert({
          table_name,
          operation: 'DROP_COLUMN',
          column_name,
          success: true
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Column deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'rename') {
      const { new_column_name } = await req.json();
      
      // Rename the actual column in the database
      const sql = `ALTER TABLE public.${table_name} RENAME COLUMN ${column_name} TO ${new_column_name}`;
      
      const { error: sqlError } = await supabaseClient.rpc('execute_admin_sql', {
        sql_statement: sql
      });

      if (sqlError) throw sqlError;

      // Update configuration entry
      await supabaseClient
        .from('column_configurations')
        .update({
          column_name: new_column_name,
          updated_at: new Date().toISOString()
        })
        .eq('table_name', table_name)
        .eq('column_name', column_name);

      // Log the change
      await supabaseClient
        .from('schema_change_log')
        .insert({
          table_name,
          operation: 'RENAME_COLUMN',
          column_name,
          old_value: column_name,
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