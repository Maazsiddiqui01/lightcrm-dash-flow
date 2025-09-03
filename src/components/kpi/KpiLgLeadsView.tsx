import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { StatsCard } from '@/components/shared/StatsCard';

interface LgLeadData {
  lg_lead: string;
  avg_hours_per_week: number;
  opportunities: string;
  top_opportunities: string;
}

interface KpiLgLeadsViewProps {
  startDate?: Date;
  endDate?: Date;
  selectedLeads?: string[];
}

export function KpiLgLeadsView({ 
  startDate = new Date(new Date().getFullYear(), 0, 1), // First day of current year
  endDate = new Date(), // Today
  selectedLeads = []
}: KpiLgLeadsViewProps) {
  const [data, setData] = useState<LgLeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: rpcData, error: rpcError } = await supabase.rpc('kpi_lg_hours_and_opps', {
        p_start: startDate.toISOString().split('T')[0],
        p_end: endDate.toISOString().split('T')[0],
        p_default_meeting_min: 60
      });

      if (rpcError) {
        throw rpcError;
      }

      // Filter by selected leads if any
      const filteredData = selectedLeads.length > 0 
        ? (rpcData || []).filter((item: any) => selectedLeads.includes(item.lg_lead))
        : (rpcData || []);

      setData(filteredData as LgLeadData[]);
    } catch (err) {
      console.error('Error fetching LG Leads KPI data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast({
        title: "Error loading KPI data",
        description: "Failed to fetch LG Leads metrics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedLeads]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!data.length) return { totalHours: 0, avgHoursPerWeek: 0, totalOpportunities: 0 };

    const totalHours = data.reduce((sum, item) => sum + item.avg_hours_per_week, 0);
    const avgHoursPerWeek = totalHours / data.length;
    const totalOpportunities = data.reduce((sum, item) => sum + parseInt(item.opportunities || '0'), 0);

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerWeek: Math.round(avgHoursPerWeek * 100) / 100,
      totalOpportunities
    };
  }, [data]);

  const formatOpportunities = (opportunities: string) => {
    if (!opportunities || opportunities === '—') return '—';
    return opportunities.length > 50 ? opportunities.substring(0, 50) + '...' : opportunities;
  };

  const exportToCSV = () => {
    const headers = ['LG Lead', 'Avg Hours/Week', 'Opportunities', 'Top Opportunities'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        `"${row.lg_lead}"`,
        row.avg_hours_per_week.toFixed(2),
        row.opportunities || '0',
        `"${row.top_opportunities}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lg-leads-kpi-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify({ 
      exportDate: new Date().toISOString(),
      dateRange: { startDate, endDate },
      summary: summaryMetrics,
      data 
    }, null, 2);

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lg-leads-kpi-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPI Cards Loading */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Loading */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </CardTitle>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Failed to load KPI data</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button onClick={fetchData} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">No data found</p>
            <p className="text-sm text-muted-foreground">No data found for the selected date range</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Hours"
          value={summaryMetrics.totalHours.toFixed(2)}
          icon={Calendar}
        />
        <StatsCard
          title="Avg Hours/Week"
          value={summaryMetrics.avgHoursPerWeek.toFixed(2)}
          icon={Calendar}
        />
        <StatsCard
          title="Total Opportunities"
          value={summaryMetrics.totalOpportunities.toString()}
          icon={Users}
        />
      </div>

      {/* LG Leads Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                LG Leads Performance
              </CardTitle>
              <CardDescription>
                Investment professional metrics ({data.length} leads)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={exportToJSON} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold min-w-48">LG Lead</TableHead>
                  <TableHead className="font-semibold text-right w-32">Avg Hours/Week</TableHead>
                  <TableHead className="font-semibold text-center w-28">Opportunities</TableHead>
                  <TableHead className="font-semibold min-w-64">Top Opportunities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((lead, index) => (
                  <TableRow key={`${lead.lg_lead}-${index}`} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {lead.lg_lead || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {lead.avg_hours_per_week.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono">
                        {lead.opportunities || '0'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate cursor-help">
                              {formatOpportunities(lead.top_opportunities)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="whitespace-pre-wrap">
                              {lead.top_opportunities || '—'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}