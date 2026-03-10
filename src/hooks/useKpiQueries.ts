import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KpiFilters } from '@/state/useKpiFilters';
import { useToast } from '@/hooks/use-toast';

export const toRpcArgs = (filters: KpiFilters) => ({
  p_start: filters.dateStart,
  p_end: filters.dateEnd,
  p_focus_areas: filters.focusAreas.length > 0 ? filters.focusAreas : null,
  p_sector: filters.sectors.length > 0 ? filters.sectors : null,
  p_ownership: filters.ownership.length > 0 ? filters.ownership : null,
});

export const useKpiHeader = (filters: KpiFilters) => {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ['kpi-header', filters],
    queryFn: async () => {
      const args = toRpcArgs(filters);
      // Using existing kpi_summary function as placeholder
      const { data, error } = await (supabase.rpc as any)('kpi_summary', {
        p_start: filters.dateStart,
        p_end: filters.dateEnd,
        p_focus_area: filters.focusAreas[0] || null,
        p_lg_lead_name: null,
        p_ebitda_min: 35,
        p_family_owned_only: true,
      });
      if (error) {
        toast({
          title: 'Error loading KPI header',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
      const result = data?.[0];
      if (result && 'meetings_count' in result) {
        return {
          total_contacts: result.total_contacts,
          total_meetings: result.meetings_count,
          notable_opportunities: result.notable_opportunities
        };
      }
      return { total_contacts: 0, total_meetings: 0, notable_opportunities: 0 };
    },
    staleTime: 60_000,
  });
};

export const useKpiMeetingsPerMonth = (filters: KpiFilters) => {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ['kpi-meetings-monthly', filters],
    queryFn: async () => {
      // Using existing kpi_meetings_monthly function 
      const { data, error } = await supabase.rpc('kpi_meetings_monthly', {
        p_start: filters.dateStart,
        p_end: filters.dateEnd,
        p_focus_area: filters.focusAreas[0] || null,
        p_lg_lead_name: null,
      });
      if (error) {
        toast({
          title: 'Error loading meetings data',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
      return data || [];
    },
    staleTime: 60_000,
  });
};

export const useKpiLeadsPerformance = (filters: KpiFilters) => {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ['kpi-leads-performance', filters],
    queryFn: async () => {
      // Using existing kpi_lg_hours_and_opps function
      const { data, error } = await supabase.rpc('kpi_lg_hours_and_opps', {
        p_start: filters.dateStart,
        p_end: filters.dateEnd,
        p_default_meeting_min: 60,
      });
      if (error) {
        toast({
          title: 'Error loading leads performance',
          description: error.message,
          variant: 'destructive',
        });
        throw error;
      }
      return data || [];
    },
    staleTime: 60_000,
  });
};