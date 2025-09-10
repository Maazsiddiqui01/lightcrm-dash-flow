import { useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCardsNew } from '@/components/kpi/KpiCardsNew';
import { KpiFilterBar } from '@/components/kpi/KpiFilterBar';
import { MeetingsChart } from '@/components/kpi/MeetingsChart';
import { KpiLgLeadsView } from '@/components/kpi/KpiLgLeadsView';
import { useKpiFilters } from '@/state/useKpiFilters';
import { useKpiHeader, useKpiMeetingsPerMonth, useKpiLeadsPerformance } from '@/hooks/useKpiQueries';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function KPIs() {
  const filters = useKpiFilters();
  
  const { data: headerData, isLoading: headerLoading, refetch: refetchHeader } = useKpiHeader(filters);
  const { data: meetingsData, isLoading: meetingsLoading, refetch: refetchMeetings } = useKpiMeetingsPerMonth(filters);
  const { data: leadsData, isLoading: leadsLoading, refetch: refetchLeads } = useKpiLeadsPerformance(filters);

  const dateRange = useMemo(() => {
    const start = new Date(filters.dateStart).toLocaleDateString();
    const end = new Date(filters.dateEnd).toLocaleDateString();
    return `${start} - ${end}`;
  }, [filters.dateStart, filters.dateEnd]);

  const isLoading = headerLoading || meetingsLoading || leadsLoading;

  const refetchAll = () => {
    refetchHeader();
    refetchMeetings();
    refetchLeads();
  };

  const actions = (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={refetchAll}
        disabled={isLoading}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <KpiFilterBar />
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title="KPIs"
        description="Internal CRM analytics for the investment team"
        actions={actions}
      />

      <main className="flex-1 p-6 space-y-6 bg-background overflow-auto">
        {/* KPI Cards */}
        <KpiCardsNew
          summary={headerData}
          dateRange={dateRange}
          loading={headerLoading}
          filters={filters}
        />

        {/* Meetings Chart */}
        <MeetingsChart
          data={meetingsData}
          loading={meetingsLoading}
        />

        {/* LG Leads Performance */}
        <KpiLgLeadsView
          startDate={new Date(filters.dateStart)}
          endDate={new Date(filters.dateEnd)}
          selectedLeads={[]}
        />
      </main>
    </div>
  );
}