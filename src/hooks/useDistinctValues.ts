import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'contacts_app' | 'contacts_raw' | 'opportunities_app' | 'opportunities_raw' | 'interactions_app';

interface UseDistinctValuesOptions {
  table: TableName;
  column: string;
  searchTerm?: string;
  isTextArray?: boolean; // For comma-separated text fields
}

export function useDistinctValues({ 
  table, 
  column, 
  searchTerm = '', 
  isTextArray = false 
}: UseDistinctValuesOptions) {
  const [values, setValues] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchValues = async () => {
      if (!table || !column) return;
      
      setLoading(true);
      try {
        if (isTextArray) {
          // For comma-separated text fields, we need to get all rows and parse on client
          const { data, error } = await supabase
            .from(table as any)
            .select(column)
            .not(column, 'is', null);
          
          if (error) throw error;
          
          const uniqueValues = new Set<string>();
          data?.forEach((row: any) => {
            const text = row[column];
            if (text && typeof text === 'string') {
              // Split by comma and clean up each value
              const items = text.split(',').map(item => item.trim()).filter(Boolean);
              items.forEach(item => uniqueValues.add(item));
            }
          });
          
          const sortedValues = Array.from(uniqueValues)
            .filter(value => !searchTerm || value.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort()
            .map(value => ({ value, label: value }));
          
          setValues(sortedValues);
        } else {
          // For regular columns, use distinct query
          let query = supabase
            .from(table as any)
            .select(column, { count: 'exact', head: false })
            .not(column, 'is', null);
          
          if (searchTerm) {
            query = query.ilike(column, `%${searchTerm}%`);
          }
          
          const { data, error } = await query.order(column);
          
          if (error) throw error;
          
          const uniqueValues = Array.from(new Set(
            data?.map((row: any) => row[column]).filter(Boolean) || []
          )).map(value => ({ value: String(value), label: String(value) }));
          
          setValues(uniqueValues);
        }
      } catch (error) {
        console.error('Error fetching distinct values:', error);
        setValues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchValues();
  }, [table, column, searchTerm, isTextArray]);

  return { values, loading };
}