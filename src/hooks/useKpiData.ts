import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FilterValues {
  focus_areas: string[];
  lg_leads: string[];
}

interface KpiFilters {
  start: string;
  end: string;
  focus_areas: string[];
  lg_leads: string[];
  ebitda_min: number;
  family_owned_only: boolean;
}

interface KpiSummary {
  total_contacts: number;
  meetings_count: number;
  notable_opportunities: number;
}

interface MonthlyMeeting {
  month: string;
  count: number;
}

interface LgLead {
  lg_lead: string;
  avg_hours_per_week: number;
  opportunities: string;
}

interface KpiData {
  summary: KpiSummary | null;
  monthlyMeetings: MonthlyMeeting[];
  lgLeads: LgLead[];
  filterValues: FilterValues | null;
  loading: boolean;
  error: string | null;
}

export function useKpiData() {
  const [data, setData] = useState<KpiData>({
    summary: { total_contacts: 0, meetings_count: 0, notable_opportunities: 0 },
    monthlyMeetings: [],
    lgLeads: [],
    filterValues: { focus_areas: [], lg_leads: [] },
    loading: true,
    error: null,
  });

  const [filters, setFilters] = useState<KpiFilters>(() => {
    const currentYear = new Date().getFullYear();
    const start = new Date(currentYear, 0, 1);
    const end = new Date();
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      focus_areas: [],
      lg_leads: [],
      ebitda_min: 35,
      family_owned_only: true,
    };
  });

  const { toast } = useToast();

  const fetchFilterValues = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('kpi_filter_values')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching filter values:', error);
      return { focus_areas: [], lg_leads: [] };
    }
  }, []);

  const fetchSummary = useCallback(async (params: KpiFilters) => {
    try {
      // If multiple leads selected, aggregate; if none selected, pass null
      const lgLeadParam = params.lg_leads.length === 1 ? params.lg_leads[0] : null;
      const focusAreaParam = params.focus_areas.length === 1 ? params.focus_areas[0] : null;

      const { data, error } = await supabase.rpc('kpi_summary', {
        p_start: params.start,
        p_end: params.end,
        p_focus_area: focusAreaParam,
        p_lg_lead_name: lgLeadParam,
        p_ebitda_min: params.ebitda_min,
        p_family_owned_only: params.family_owned_only,
      });

      if (error) throw error;
      return data?.[0] || { total_contacts: 0, meetings_count: 0, notable_opportunities: 0 };
    } catch (error) {
      console.error('Error fetching summary:', error);
      return { total_contacts: 0, meetings_count: 0, notable_opportunities: 0 };
    }
  }, []);

  const fetchMonthlyMeetings = useCallback(async (params: KpiFilters) => {
    try {
      const lgLeadParam = params.lg_leads.length === 1 ? params.lg_leads[0] : null;
      const focusAreaParam = params.focus_areas.length === 1 ? params.focus_areas[0] : null;

      const { data, error } = await supabase.rpc('kpi_meetings_monthly', {
        p_start: params.start,
        p_end: params.end,
        p_focus_area: focusAreaParam,
        p_lg_lead_name: lgLeadParam,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching monthly meetings:', error);
      return [];
    }
  }, []);

  const fetchLgLeads = useCallback(async (params: KpiFilters) => {
    try {
      const { data, error } = await supabase.rpc('kpi_lg_hours_and_opps', {
        p_start: params.start,
        p_end: params.end,
        p_default_meeting_min: 60,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching LG leads:', error);
      return [];
    }
  }, []);

  const fetchAllData = useCallback(async (currentFilters: KpiFilters) => {
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [filterValues, summary, monthlyMeetings, lgLeads] = await Promise.all([
        data.filterValues ? Promise.resolve(data.filterValues) : fetchFilterValues(),
        fetchSummary(currentFilters),
        fetchMonthlyMeetings(currentFilters),
        fetchLgLeads(currentFilters),
      ]);

      setData({
        summary,
        monthlyMeetings,
        lgLeads,
        filterValues,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load KPI data. Please try again.',
      }));
      toast({
        title: 'Error',
        description: 'Failed to load KPI data',
        variant: 'destructive',
      });
    }
  }, [data.filterValues, fetchFilterValues, fetchSummary, fetchMonthlyMeetings, fetchLgLeads, toast]);

  const updateFilters = useCallback((newFilters: Partial<KpiFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Debounce the API calls
    const timeoutId = setTimeout(() => {
      fetchAllData(updatedFilters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters, fetchAllData]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData(filters);
  }, []);

  return {
    data,
    filters,
    updateFilters,
    refetch: () => fetchAllData(filters),
  };
}