import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHero } from '@/components/layout/DashboardHero';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import { KpiCard } from '@/components/sourcing/KpiCard';
import { Slicers } from '@/components/sourcing/Slicers';
import { MeetingsChart } from '@/components/sourcing/MeetingsChart';
import { OppsChart } from '@/components/sourcing/OppsChart';
import { ExportButtons } from '@/components/sourcing/ExportButtons';
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { DuplicateAlertCard } from "@/components/dashboard/DuplicateAlertCard";
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useToast } from '@/hooks/use-toast';
import { useDuplicateStats } from '@/hooks/useDuplicateStats';

interface SourcingFilters {
  dateRange: string; // 'all' | year (e.g., '2024') | quarter (e.g., '2024 Q4')
  sector: string[];
  focusArea: string[];
  lgLead: string[];
  tier: string[];
  status: string[];
  platformAddon: string[];
  ownershipType: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
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
  platformAddon: [],
  ownershipType: [],
  ebitdaMin: undefined,
  ebitdaMax: undefined,
  searchText: '',
};

export default function SourceGreatnessPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { filters, updateFilters: setFilters } = useUrlFilters(defaultFilters);
  const { data: duplicateStats } = useDuplicateStats();

  // Type-safe filter accessors
  const filterState = filters as SourcingFilters;

  // Fetch opportunities data
  const { data: opportunities = [], isLoading: oppsLoading } = useQuery({
    queryKey: ['sourcing-opportunities', filters],
    queryFn: async () => {
      let query = supabase.from('opportunities_raw').select('*');
      
      // Apply year filter with exact text matching (dates normalized to years)
      if (filterState.dateRange !== 'all') {
        query = query.eq('date_of_origination', filterState.dateRange);
      }
      // Note: When dateRange === 'all', no date filter is applied (includes null dates)
      
      // Apply other filters
      if (Array.isArray(filterState.sector) && filterState.sector.length > 0) {
        query = query.in('sector', filterState.sector);
      }
      // Use exact matching for focus areas (same as Contacts and Opportunities)
      if (Array.isArray(filterState.focusArea) && filterState.focusArea.length > 0) {
        query = query.in('lg_focus_area', filterState.focusArea);
      }
      // Use exact matching for LG leads (same as Contacts and Opportunities)
      if (Array.isArray(filterState.lgLead) && filterState.lgLead.length > 0) {
        const orConditions = filterState.lgLead.flatMap(lead => [
          `investment_professional_point_person_1.eq.${lead}`,
          `investment_professional_point_person_2.eq.${lead}`
        ]).join(',');
        query = query.or(orConditions);
      }
      if (Array.isArray(filterState.tier) && filterState.tier.length > 0) {
        query = query.in('tier', filterState.tier);
      }
      if (Array.isArray(filterState.status) && filterState.status.length > 0) {
        query = query.in('status', filterState.status);
      }
      if (Array.isArray(filterState.platformAddon) && filterState.platformAddon.length > 0) {
        query = query.in('platform_add_on', filterState.platformAddon);
      }
      if (Array.isArray(filterState.ownershipType) && filterState.ownershipType.length > 0) {
        query = query.in('ownership_type', filterState.ownershipType);
      }
      
      // EBITDA range filter
      if (filterState.ebitdaMin !== null && filterState.ebitdaMin !== undefined) {
        query = query.gte('ebitda_in_ms', filterState.ebitdaMin);
      }
      if (filterState.ebitdaMax !== null && filterState.ebitdaMax !== undefined) {
        query = query.lte('ebitda_in_ms', filterState.ebitdaMax);
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

  // Fetch meetings data - filtered by contacts from filtered opportunities
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['sourcing-meetings', filters], // Changed to use all filters
    queryFn: async () => {
      // First, extract contact names from filtered opportunities
      const filteredContactNames = new Set<string>();
      opportunities.forEach(opp => {
        if (opp.deal_source_individual_1) filteredContactNames.add(opp.deal_source_individual_1);
        if (opp.deal_source_individual_2) filteredContactNames.add(opp.deal_source_individual_2);
      });
      
      // If filters are applied but no opportunities match, return empty meetings
      const hasFilters = filterState.focusArea.length > 0 || filterState.sector.length > 0 || 
                        filterState.lgLead.length > 0 || filterState.tier.length > 0 ||
                        filterState.status.length > 0 || filterState.platformAddon.length > 0 ||
                        filterState.ownershipType.length > 0 || filterState.searchText;
      
      if (hasFilters && filteredContactNames.size === 0) {
        return [];
      }
      
      let query = supabase
        .from('interactions_app')
        .select('occurred_at, from_name, to_names, cc_names')
        .ilike('source', '%meeting%')
        .order('occurred_at');
      
      // Filter meetings by selected year
      if (filterState.dateRange !== 'all') {
        const year = parseInt(filterState.dateRange);
        if (!isNaN(year)) {
          const startDate = new Date(year, 0, 1).toISOString();
          const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
          query = query.gte('occurred_at', startDate).lte('occurred_at', endDate);
        }
      }
      
      // Filter by contacts from filtered opportunities (if any filters applied)
      if (hasFilters && filteredContactNames.size > 0) {
        const contactConditions = Array.from(filteredContactNames).map(name => 
          `from_name.ilike.%${name}%,to_names.ilike.%${name}%,cc_names.ilike.%${name}%`
        ).join(',');
        query = query.or(contactConditions);
      }
      
      const { data, error } = await query;
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
    enabled: !oppsLoading, // Wait for opportunities to load first
  });

  // Fetch referral data - using filtered opportunities from opportunities_raw
  const { data: referralContacts = [] } = useQuery({
    queryKey: ['sourcing-referral-contacts', filters],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('deal_source_individual_1, deal_source_individual_2, ebitda_in_ms');
      
      // Apply EBITDA filters to match main opportunities query
      if (filterState.ebitdaMin !== null && filterState.ebitdaMin !== undefined) {
        query = query.gte('ebitda_in_ms', filterState.ebitdaMin);
      }
      if (filterState.ebitdaMax !== null && filterState.ebitdaMax !== undefined) {
        query = query.lte('ebitda_in_ms', filterState.ebitdaMax);
      }
      
      const { data, error } = await query;
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
    queryKey: ['sourcing-referral-companies', filters],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('deal_source_company, ebitda_in_ms');
      
      // Apply EBITDA filters to match main opportunities query
      if (filterState.ebitdaMin !== null && filterState.ebitdaMin !== undefined) {
        query = query.gte('ebitda_in_ms', filterState.ebitdaMin);
      }
      if (filterState.ebitdaMax !== null && filterState.ebitdaMax !== undefined) {
        query = query.lte('ebitda_in_ms', filterState.ebitdaMax);
      }
      
      const { data, error } = await query;
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

  // Fetch contacts headline - using contacts_raw
  const { data: contactsHeadline } = useQuery({
    queryKey: ['sourcing-contacts-headline'],
    queryFn: async () => {
      const { count: totalContacts } = await supabase
        .from('contacts_raw')
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
    // Note: EBITDA filtering is now handled at the query level, not client-side
    const filtered = opportunities;

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

  // Meetings are now filtered by date range to match opportunity filtering
  const filteredMeetings = meetings;

  const totalMeetings = filteredMeetings.reduce((sum, m) => sum + (Number(m.meeting_count) || 0), 0);

  const loading = oppsLoading || meetingsLoading;

  return (
    <DashboardErrorBoundary>
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

          {/* AI Insights Widget */}
          <AIInsightsWidget />

          {/* Duplicate Alert */}
          {duplicateStats && duplicateStats.totalCount > 0 && (
            <DuplicateAlertCard
              count={duplicateStats.totalCount}
              highPriorityCount={duplicateStats.highPriorityCount}
              onViewClick={() => navigate('/admin/data-maintenance?tab=fuzzy-duplicates')}
            />
          )}

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

          {/* Enhanced Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <OppsChart
              type="platform-addon"
              data={metrics.filteredOpportunities}
              loading={loading}
            />
            <OppsChart
              type="lg-leads"
              data={metrics.filteredOpportunities}
              loading={loading}
            />
            <OppsChart
              type="sector"
              data={metrics.filteredOpportunities}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  );
}
