import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCards } from '@/components/kpi/KpiCards';
import { FiltersDrawer } from '@/components/kpi/FiltersDrawer';
import { MeetingsChart } from '@/components/kpi/MeetingsChart';
import { KpiLgLeadsView } from '@/components/kpi/KpiLgLeadsView';
import { useKpiData } from '@/hooks/useKpiData';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function KPIs() {
  const { data, filters, updateFilters, refetch } = useKpiData();

  const dateRange = useMemo(() => {
    const start = new Date(filters.start).toLocaleDateString();
    const end = new Date(filters.end).toLocaleDateString();
    return `${start} - ${end}`;
  }, [filters.start, filters.end]);

  const handleReset = () => {
    const currentYear = new Date().getFullYear();
    const resetFilters = {
      start: new Date(currentYear, 0, 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      focus_areas: [],
      lg_leads: [],
      ebitda_min: 35,
      family_owned_only: true,
    };
    updateFilters(resetFilters);
  };

  const actions = (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={refetch}
        disabled={data.loading}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${data.loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <FiltersDrawer
        filters={filters}
        filterValues={data.filterValues}
        onFiltersChange={updateFilters}
        onReset={handleReset}
      />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="KPIs"
        description="Internal CRM analytics for the investment team"
        actions={actions}
      />

      <main className="flex-1 p-6 space-y-6 bg-background">
        {/* Error State */}
        {data.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{data.error}</span>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <KpiCards
          summary={data.summary}
          dateRange={dateRange}
          loading={data.loading}
        />

        {/* Meetings Chart */}
        <MeetingsChart
          data={data.monthlyMeetings}
          loading={data.loading}
        />

        {/* LG Leads Performance */}
        <KpiLgLeadsView
          startDate={new Date(filters.start)}
          endDate={new Date(filters.end)}
          selectedLeads={filters.lg_leads}
        />
      </main>
    </div>
  );
}