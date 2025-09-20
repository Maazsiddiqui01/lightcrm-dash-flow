import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDistinctFocusAreas = () => {
  return useQuery({
    queryKey: ['kpi-distinct-focus-areas'],
    queryFn: async () => {
      // Use the master table for active focus areas
      const { data, error } = await supabase
        .from('lg_focus_area_master')
        .select('focus_area')
        .eq('is_active', true)
        .order('focus_area');
      
      if (error) throw error;
      
      return data?.map(row => row.focus_area) || [];
    },
    staleTime: 60_000,
  });
};

export const useDistinctSectors = () => {
  return useQuery({
    queryKey: ['kpi-distinct-sectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts_app')
        .select('lg_sector')
        .not('lg_sector', 'is', null)
        .neq('lg_sector', '');
      
      if (error) throw error;
      
      const sectors = [...new Set(data?.map(row => row.lg_sector).filter(Boolean))];
      return sectors.sort();
    },
    staleTime: 60_000,
  });
};

export const useDistinctOwnershipTypes = () => {
  return useQuery({
    queryKey: ['kpi-distinct-ownership-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_app')
        .select('ownership_type')
        .not('ownership_type', 'is', null)
        .neq('ownership_type', '');
      
      if (error) throw error;
      
      const types = [...new Set(data?.map(row => row.ownership_type).filter(Boolean))];
      return types.sort();
    },
    staleTime: 60_000,
  });
};