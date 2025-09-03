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
      // Get unique focus areas from contacts
      const { data: focusAreasData } = await supabase
        .from('contacts_app')
        .select('lg_focus_area_1, lg_focus_area_2, lg_focus_area_3, lg_focus_area_4, lg_focus_area_5, lg_focus_area_6, lg_focus_area_7, lg_focus_area_8')
        .not('lg_focus_area_1', 'is', null);

      // Get unique LG leads
      const { data: leadsData } = await supabase
        .from('contacts_app')
        .select('lg_sector')
        .not('lg_sector', 'is', null);

      const focusAreas = new Set<string>();
      const lgLeads = new Set<string>();

      focusAreasData?.forEach(contact => {
        [
          contact.lg_focus_area_1,
          contact.lg_focus_area_2,
          contact.lg_focus_area_3,
          contact.lg_focus_area_4,
          contact.lg_focus_area_5,
          contact.lg_focus_area_6,
          contact.lg_focus_area_7,
          contact.lg_focus_area_8,
        ].forEach(area => {
          if (area) focusAreas.add(area);
        });
      });

      leadsData?.forEach(contact => {
        if (contact.lg_sector) lgLeads.add(contact.lg_sector);
      });

      return {
        focus_areas: Array.from(focusAreas).sort(),
        lg_leads: Array.from(lgLeads).sort(),
      };
    } catch (error) {
      console.error('Error fetching filter values:', error);
      return { focus_areas: [], lg_leads: [] };
    }
  }, []);

  const fetchSummary = useCallback(async (params: KpiFilters) => {
    try {
      // Query contacts
      let contactsQuery = supabase.from('contacts_app').select('id', { count: 'exact' });
      
      // Query interactions for meetings
      let meetingsQuery = supabase
        .from('interactions_app')
        .select('id', { count: 'exact' })
        .gte('occurred_at', params.start + 'T00:00:00')
        .lte('occurred_at', params.end + 'T23:59:59');

      // Query opportunities
      let oppsQuery = supabase.from('opportunities_app').select('id', { count: 'exact' });
      
      // Apply filters if specified
      if (params.focus_areas.length > 0) {
        contactsQuery = contactsQuery.in('lg_focus_area_1', params.focus_areas);
      }
      
      if (params.lg_leads.length > 0) {
        contactsQuery = contactsQuery.in('lg_sector', params.lg_leads);
      }

      const [contactsResult, meetingsResult, oppsResult] = await Promise.all([
        contactsQuery,
        meetingsQuery,
        oppsQuery,
      ]);

      return {
        total_contacts: contactsResult.count || 0,
        meetings_count: meetingsResult.count || 0,
        notable_opportunities: oppsResult.count || 0,
      };
    } catch (error) {
      console.error('Error fetching summary:', error);
      return {
        total_contacts: 0,
        meetings_count: 0,
        notable_opportunities: 0,
      };
    }
  }, []);

  const fetchMonthlyMeetings = useCallback(async (params: KpiFilters) => {
    try {
      const { data: meetings, error } = await supabase
        .from('interactions_app')
        .select('occurred_at')
        .gte('occurred_at', params.start + 'T00:00:00')
        .lte('occurred_at', params.end + 'T23:59:59');

      if (error) throw error;

      // Group by month client-side
      const monthCounts: { [key: string]: number } = {};
      meetings?.forEach((meeting) => {
        if (meeting.occurred_at) {
          const month = new Date(meeting.occurred_at).toISOString().slice(0, 7);
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
      });

      return Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      console.error('Error fetching monthly meetings:', error);
      return [];
    }
  }, []);

  const fetchLgLeads = useCallback(async (params: KpiFilters) => {
    try {
      // Get LG leads with their contact counts and meeting data
      const { data: contacts, error } = await supabase
        .from('contacts_app')
        .select('lg_sector, of_meetings')
        .not('lg_sector', 'is', null);

      if (error) throw error;

      // Group by LG sector and calculate stats
      const leadStats: { [key: string]: { meetings: number; contacts: number; opportunities: string[] } } = {};
      
      contacts?.forEach(contact => {
        if (contact.lg_sector) {
          if (!leadStats[contact.lg_sector]) {
            leadStats[contact.lg_sector] = { meetings: 0, contacts: 0, opportunities: [] };
          }
          leadStats[contact.lg_sector].meetings += contact.of_meetings || 0;
          leadStats[contact.lg_sector].contacts += 1;
        }
      });

      // Convert to array format with calculated hours
      return Object.entries(leadStats).map(([lg_lead, stats]) => ({
        lg_lead,
        avg_hours_per_week: stats.meetings > 0 ? (stats.meetings * 60) / 52 / 60 : 0, // Assuming 1 hour per meeting
        opportunities: `${stats.contacts} contacts, ${stats.meetings} meetings`,
      }));
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