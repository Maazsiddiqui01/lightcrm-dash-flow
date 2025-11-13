import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical hook for fetching sectors.
 * Primary source: lookup_sectors (curated list)
 * Fallback: ui_distinct_lg_sectors (union of all sectors from data)
 */
export function useDistinctSectors() {
  return useQuery({
    queryKey: ['distinct_lg_sectors'],
    queryFn: async () => {
      // Try lookup_sectors first (canonical source)
      const { data: lookupData, error: lookupError } = await supabase
        .from('lookup_sectors')
        .select('label')
        .order('label', { ascending: true });
      
      if (!lookupError && lookupData && lookupData.length > 0) {
        return lookupData.map(item => item.label);
      }

      console.warn('lookup_sectors empty or failed, falling back to ui_distinct_lg_sectors');
      
      // Fallback to ui_distinct_lg_sectors view
      const { data, error } = await supabase
        .from('ui_distinct_lg_sectors')
        .select('lg_sector')
        .order('lg_sector', { ascending: true });
      
      if (error) throw error;
      return (data ?? []).map(d => d.lg_sector);
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}