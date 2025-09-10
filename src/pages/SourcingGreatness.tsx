import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/sourcing/KpiCard';
import { Slicers } from '@/components/sourcing/Slicers';
import { MeetingsChart } from '@/components/sourcing/MeetingsChart';
import { OppsChart } from '@/components/sourcing/OppsChart';
import { ExportButtons } from '@/components/sourcing/ExportButtons';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useToast } from '@/hooks/use-toast';

interface SourcingFilters {
  dateRange: [string, string];
  sector: string[];
  focusArea: string[];
  lgLead: string[];
  tier: string[];
  status: string[];
  platformAddon: 'all' | 'platform' | 'addon';
  ownershipType: 'all' | 'family_founder' | 'other';
  ebitdaBucket: string[];
  searchText: string;
}

const defaultFilters: SourcingFilters = {
  dateRange: ['2024-01-01', '2025-12-31'],
  sector: [],
  focusArea: [],
  lgLead: [],
  tier: [],
  status: [],
  platformAddon: 'all',
  ownershipType: 'all',
  ebitdaBucket: [],
  searchText: '',
};

export default function SourcingGreatness() {
  const { toast } = useToast();
  const [filters, setFilters] = useUrlFilters('sourcing', defaultFilters);

  // Fetch opportunities data
  const { data: opportunities = [], isLoading: oppsLoading } = useQuery({
    queryKey: ['sourcing-opportunities', filters],
    queryFn: async () => {
      let query = supabase.from('opportunities_app').select('*');
      
      // Apply filters
      if (filters.sector.length > 0) {
        query = query.in('sector', filters.sector);
      }
      if (filters.focusArea.length > 0) {
        query = query.or(filters.focusArea.map(fa => `lg_focus_area.ilike.%${fa}%`).join(','));
      }
      if (filters.lgLead.length > 0) {
        const leadFilters = filters.lgLead.map(lead => 
          `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
        ).join(',');
        query = query.or(leadFilters);
      }
      if (filters.tier.length > 0) {
        query = query.in('tier', filters.tier);
      }
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.platformAddon === 'platform') {
        query = query.ilike('platform_add_on', '%platform%');
      } else if (filters.platformAddon === 'addon') {
        query = query.ilike('platform_add_on', '%add%');
      }
      if (filters.ownershipType === 'family_founder') {
        query = query.or('ownership_type.ilike.%family%,ownership_type.ilike.%founder%');
      } else if (filters.ownershipType === 'other') {
        query = query.not('ownership_type', 'ilike', '%family%').not('ownership_type', 'ilike', '%founder%');
      }
      if (filters.searchText) {
        query = query.or(`deal_name.ilike.%${filters.searchText}%,deal_source_individual_1.ilike.%${filters.searchText}%,deal_source_individual_2.ilike.%${filters.searchText}%`);
      }

      // Date filter on text field
      const [startYear] = filters.dateRange;
      const [endYear] = filters.dateRange;
      if (startYear && endYear) {
        const startYearStr = startYear.split('-')[0];
        const endYearStr = endYear.split('-')[0];
        if (startYearStr === endYearStr) {
          query = query.ilike('date_of_origination', `%${startYearStr}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch meetings data
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['kpi-meetings-monthly'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_meetings_monthly')
        .select('*')
        .order('month_start');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch referral data
  const { data: referralContacts = [] } = useQuery({
    queryKey: ['kpi-referral-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_referral_contacts')
        .select('*')
        .order('opp_count', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: referralCompanies = [] } = useQuery({
    queryKey: ['kpi-referral-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_referral_companies')
        .select('*')
        .order('opp_count', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch contacts headline
  const { data: contactsHeadline } = useQuery({
    queryKey: ['kpi-contacts-headline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_contacts_headline')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  // Compute derived metrics
  const metrics = useMemo(() => {
    const filtered = opportunities.filter(opp => {
      // Apply EBITDA bucket filter
      if (filters.ebitdaBucket.length > 0) {
        const ebitda = Number(opp.ebitda_in_ms) || 0;
        const bucket = ebitda < 20 ? '<20' : ebitda <= 35 ? '20-35' : '>35';
        if (!filters.ebitdaBucket.includes(bucket)) return false;
      }
      return true;
    });

    const platformOpps = filtered.filter(o => o.platform_add_on?.toLowerCase().includes('platform'));
    const addonOpps = filtered.filter(o => o.platform_add_on?.toLowerCase().includes('add'));
    const familyFounderOpps = filtered.filter(o => 
      o.ownership_type?.toLowerCase().includes('family') || 
      o.ownership_type?.toLowerCase().includes('founder')
    );

    return {
      totalOpportunities: filtered.length,
      platformOpps: platformOpps.length,
      avgPlatformEbitda: platformOpps.length > 0 
        ? platformOpps.reduce((sum, o) => sum + (Number(o.ebitda_in_ms) || 0), 0) / platformOpps.length 
        : 0,
      familyFounderPercentage: filtered.length > 0 
        ? (familyFounderOpps.length / filtered.length) * 100 
        : 0,
      addonOpps: addonOpps.length,
      avgAddonEbitda: addonOpps.length > 0 
        ? addonOpps.reduce((sum, o) => sum + (Number(o.ebitda_in_ms) || 0), 0) / addonOpps.length 
        : 0,
      pipelineValue: filtered.reduce((sum, o) => sum + (Number(o.ebitda_in_ms) || 0), 0),
      filteredOpportunities: filtered,
    };
  }, [opportunities, filters]);

  // Filter meetings by date range
  const filteredMeetings = useMemo(() => {
    const [start, end] = filters.dateRange;
    return meetings.filter(m => {
      const monthStart = new Date(m.month_start);
      return monthStart >= new Date(start) && monthStart <= new Date(end);
    });
  }, [meetings, filters.dateRange]);

  const totalMeetings = filteredMeetings.reduce((sum, m) => sum + (Number(m.meeting_count) || 0), 0);

  const loading = oppsLoading || meetingsLoading;

  return (
    <div className="min-h-0 h-[calc(100vh-140px)] overflow-auto">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Sourcing Greatness" 
            description="Interactive dashboard with KPIs and analytics"
          />
          <ExportButtons 
            opportunities={metrics.filteredOpportunities}
            filters={filters}
          />
        </div>

        {/* Slicers */}
        <Slicers 
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Total Opportunities"
            value={metrics.totalOpportunities}
            loading={loading}
          />
          <KpiCard
            title="Platform Opps"
            value={metrics.platformOpps}
            loading={loading}
          />
          <KpiCard
            title="Avg Platform EBITDA"
            value={metrics.avgPlatformEbitda}
            format="currency"
            loading={loading}
          />
          <KpiCard
            title="% Family/Founder"
            value={metrics.familyFounderPercentage}
            format="percentage"
            loading={loading}
          />
          <KpiCard
            title="Add-on Opps"
            value={metrics.addonOpps}
            loading={loading}
          />
          <KpiCard
            title="Avg Add-on EBITDA"
            value={metrics.avgAddonEbitda}
            format="currency"
            loading={loading}
          />
          <KpiCard
            title="Total Relationships"
            value={contactsHeadline?.total_contacts || 0}
            loading={loading}
          />
          <KpiCard
            title="Total Meetings"
            value={totalMeetings}
            loading={loading}
          />
          <KpiCard
            title="Meetings (90d)"
            value={contactsHeadline?.meetings_last_90d || 0}
            loading={loading}
          />
          <KpiCard
            title="Pipeline Value"
            value={metrics.pipelineValue}
            format="currency"
            loading={loading}
          />
        </div>

        {/* Primary Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MeetingsChart 
            data={filteredMeetings}
            loading={loading}
          />
          <OppsChart
            type="tier"
            data={metrics.filteredOpportunities}
            loading={loading}
          />
          <OppsChart
            type="status"
            data={metrics.filteredOpportunities}
            loading={loading}
          />
          <OppsChart
            type="ebitda"
            data={metrics.filteredOpportunities}
            loading={loading}
          />
        </div>

        {/* Sources Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <OppsChart
            type="platform-addon"
            data={metrics.filteredOpportunities}
            loading={loading}
          />
          <OppsChart
            type="referral-contacts"
            data={referralContacts}
            loading={loading}
          />
          <OppsChart
            type="referral-companies"
            data={referralCompanies}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}