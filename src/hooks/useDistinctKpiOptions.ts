import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultOwnershipTypes } from '@/lib/export/opportunityUtils';

/**
 * Use canonical lookup_focus_areas as primary source for KPI filters.
 * Fallback to ui_distinct_focus_areas_v if lookup table is empty.
 */
export const useDistinctFocusAreas = () => {
  return useQuery({
    queryKey: ['kpi-distinct-focus-areas'],
    queryFn: async () => {
      // Try lookup_focus_areas first
      const { data: lookupData, error: lookupError } = await supabase
        .from('lookup_focus_areas')
        .select('label')
        .order('label');
      
      if (!lookupError && lookupData && lookupData.length > 0) {
        return lookupData.map(item => item.label);
      }

      console.warn('lookup_focus_areas empty or failed, falling back to ui_distinct_focus_areas_v');
      
      // Fallback to ui_distinct_focus_areas_v
      const { data: viewData, error: viewError } = await supabase
        .from('ui_distinct_focus_areas_v')
        .select('focus_area')
        .order('focus_area');
      
      if (viewError) throw viewError;
      
      return (viewData || [])
        .map(item => item.focus_area)
        .filter(Boolean);
    },
    staleTime: 60_000,
  });
};

/**
 * Use canonical lookup_sectors as primary source for KPI filters.
 * Fallback to ui_distinct_lg_sectors if lookup table is empty.
 */
export const useDistinctSectors = () => {
  return useQuery({
    queryKey: ['kpi-distinct-sectors'],
    queryFn: async () => {
      // Try lookup_sectors first
      const { data: lookupData, error: lookupError } = await supabase
        .from('lookup_sectors')
        .select('label')
        .order('label');
      
      if (!lookupError && lookupData && lookupData.length > 0) {
        return lookupData.map(item => item.label);
      }

      console.warn('lookup_sectors empty or failed, falling back to ui_distinct_lg_sectors');
      
      // Fallback to ui_distinct_lg_sectors
      const { data: viewData, error: viewError } = await supabase
        .from('ui_distinct_lg_sectors')
        .select('lg_sector')
        .order('lg_sector');
      
      if (viewError) throw viewError;
      
      return (viewData || [])
        .map(item => item.lg_sector)
        .filter(Boolean);
    },
    staleTime: 60_000,
  });
};

export const useDistinctOwnershipTypes = () => {
  return useQuery({
    queryKey: ['kpi-distinct-ownership-types'],
    queryFn: async () => {
      // Use standardized ownership types from opportunityUtils
      return defaultOwnershipTypes;
    },
    staleTime: 60_000,
  });
};