import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHero } from '@/components/layout/DashboardHero';
import { KpiCard } from '@/components/sourcing/KpiCard';
import { Slicers } from '@/components/sourcing/Slicers';
import { MeetingsChart } from '@/components/sourcing/MeetingsChart';
import { OppsChart } from '@/components/sourcing/OppsChart';
import { ExportButtons } from '@/components/sourcing/ExportButtons';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useToast } from '@/hooks/use-toast';

interface SourcingFilters {
  dateRange: string; // 'all' | year (e.g., '2024') | quarter (e.g., '2024 Q4')
  sector: string[];
  focusArea: string[];
  lgLead: string[];
  tier: string[];
  status: string[];
  platformAddon: 'all' | 'platform' | 'addon';
  ownershipType: 'all' | 'family_founder' | 'other';
  ebitdaBucket: string[];
  searchText: string;
  [key: string]: any;
}

const defaultFilters: SourcingFilters = {
  dateRange: 'all',
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

export default function SourceGreatnessPage() {
  const { toast } = useToast();
  const { filters, updateFilters: setFilters } = useUrlFilters(defaultFilters);

  // Type-safe filter accessors
  const filterState = filters as SourcingFilters;

  // Fetch opportunities data
  const { data: opportunities = [], isLoading: oppsLoading } = useQuery({
    queryKey: ['sourcing-opportunities', filters],
    queryFn: async () => {
      let query = supabase.from('opportunities_raw').select('*');
      
      // Apply date filter using text matching (simple approach)
      if (filterState.dateRange !== 'all') {
        if (filterState.dateRange.includes('Q')) {
          // Quarter filter - match exact quarter string
          query = query.ilike('date_of_origination', `%${filterState.dateRange}%`);
        } else {
          // Year filter - match any occurrence of the year
          query = query.ilike('date_of_origination', `%${filterState.dateRange}%`);
        }
      }
      // Note: When dateRange === 'all', no date filter is applied (includes null dates)
      
      // Apply other filters
      if (Array.isArray(filterState.sector) && filterState.sector.length > 0) {
        query = query.in('sector', filterState.sector);
      }
      if (Array.isArray(filterState.focusArea) && filterState.focusArea.length > 0) {
        query = query.or(filterState.focusArea.map(fa => `lg_focus_area.ilike.%${fa}%`).join(','));
      }
      if (Array.isArray(filterState.lgLead) && filterState.lgLead.length > 0) {
        const leadFilters = filterState.lgLead.map(lead => 
          `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
        ).join(',');
        query = query.or(leadFilters);
      }
      if (Array.isArray(filterState.tier) && filterState.tier.length > 0) {
        query = query.in('tier', filterState.tier);
      }
      if (Array.isArray(filterState.status) && filterState.status.length > 0) {
        query = query.in('status', filterState.status);
      }
      if (filterState.platformAddon === 'platform') {
        query = query.ilike('platform_add_on', '%platform%');
      } else if (filterState.platformAddon === 'addon') {
        query = query.ilike('platform_add_on', '%add%');
      }
      if (filterState.ownershipType === 'family_founder') {
        query = query.or('ownership_type.ilike.%family%,ownership_type.ilike.%founder%');
      } else if (filterState.ownershipType === 'other') {
        query = query.not('ownership_type', 'ilike', '%family%').not('ownership_type', 'ilike', '%founder%');
      }
      if (filterState.searchText) {
        query = query.or(`deal_name.ilike.%${filterState.searchText}%,deal_source_individual_1.ilike.%${filterState.searchText}%,deal_source_individual_2.ilike.%${filterState.searchText}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Fetch meetings data - using interactions_app instead
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['sourcing-meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interactions_app')
        .select('occurred_at')
        .ilike('source', '%meeting%')
        .order('occurred_at');
      if (error) throw error;
      
      // Group by month
      const monthlyData: { [key: string]: number } = {};
      data?.forEach(interaction => {
        if (interaction.occurred_at) {
          const monthKey = new Date(interaction.occurred_at).toISOString().substring(0, 7);
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
      });
      
      return Object.entries(monthlyData).map(([month, count]) => ({
        month_start: month + '-01',
        meeting_count: count
      }));
    },
    staleTime: 60_000,
  });

  // Fetch referral data - simplified from opportunities
  const { data: referralContacts = [] } = useQuery({
    queryKey: ['sourcing-referral-contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_app')
        .select('deal_source_individual_1, deal_source_individual_2')
        .not('deal_source_individual_1', 'is', null);
      if (error) throw error;
      
      // Count referrals
      const counts: { [key: string]: number } = {};
      data?.forEach(opp => {
        if (opp.deal_source_individual_1) {
          counts[opp.deal_source_individual_1] = (counts[opp.deal_source_individual_1] || 0) + 1;
        }
        if (opp.deal_source_individual_2) {
          counts[opp.deal_source_individual_2] = (counts[opp.deal_source_individual_2] || 0) + 1;
        }
      });
      
      return Object.entries(counts)
        .map(([name, count]) => ({ referral_contact_display: name, opp_count: count }))
        .sort((a, b) => b.opp_count - a.opp_count)
        .slice(0, 10);
    },
    staleTime: 60_000,
  });

  const { data: referralCompanies = [] } = useQuery({
    queryKey: ['sourcing-referral-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_app')
        .select('deal_source_company')
        .not('deal_source_company', 'is', null);
      if (error) throw error;
      
      // Count companies
      const counts: { [key: string]: number } = {};
      data?.forEach(opp => {
        if (opp.deal_source_company) {
          counts[opp.deal_source_company] = (counts[opp.deal_source_company] || 0) + 1;
        }
      });
      
      return Object.entries(counts)
        .map(([name, count]) => ({ referral_company_display: name, opp_count: count }))
        .sort((a, b) => b.opp_count - a.opp_count)
        .slice(0, 10);
    },
    staleTime: 60_000,
  });

  // Fetch contacts headline - using contacts_app
  const { data: contactsHeadline } = useQuery({
    queryKey: ['sourcing-contacts-headline'],
    queryFn: async () => {
      const { count: totalContacts } = await supabase
        .from('contacts_app')
        .select('*', { count: 'exact', head: true });
      
      // Get meetings in last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { count: meetingsCount } = await supabase
        .from('interactions_app')
        .select('*', { count: 'exact', head: true })
        .ilike('source', '%meeting%')
        .gte('occurred_at', ninetyDaysAgo.toISOString());
      
      return {
        total_contacts: totalContacts || 0,
        meetings_last_90d: meetingsCount || 0
      };
    },
    staleTime: 60_000,
  });

  // Compute derived metrics
  const metrics = useMemo(() => {
    const filtered = opportunities.filter(opp => {
      // Apply EBITDA bucket filter
      if (Array.isArray(filterState.ebitdaBucket) && filterState.ebitdaBucket.length > 0) {
        const ebitda = Number(opp.ebitda_in_ms) || 0;
        const bucket = ebitda < 30 ? '<30' : ebitda <= 35 ? '30-35' : '>35';
        if (!filterState.ebitdaBucket.includes(bucket)) return false;
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
  }, [opportunities, filterState]);

  // Meetings are not filtered by date range in this context
  // They show the full communication timeline regardless of opportunity date filtering
  const filteredMeetings = meetings;

  const totalMeetings = filteredMeetings.reduce((sum, m) => sum + (Number(m.meeting_count) || 0), 0);

  const loading = oppsLoading || meetingsLoading;

  return (
    <div className="min-h-0 h-[calc(100vh-140px)] overflow-auto">
      <div className="space-y-6 p-6">
        {/* Hero Section */}
        <DashboardHero />

        {/* Export Controls */}
        <div className="flex justify-end">
          <ExportButtons 
            opportunities={metrics.filteredOpportunities}
            filters={filterState}
          />
        </div>

        {/* Slicers */}
        <Slicers 
          filters={filterState}
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