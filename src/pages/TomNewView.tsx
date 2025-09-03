import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { AdvancedTable } from '@/components/shared/AdvancedTable';
import { Button } from '@/components/ui/button';
import { Filter, Download, Copy } from 'lucide-react';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { jsonToCsv, downloadFile } from '@/utils/csvExport';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TomNewViewRow {
  contact_id?: string;
  deal_source_company?: string;
  deal_source_individual?: string;
  lg_sector?: string;
  lg_focus_area?: string;
  areas_of_specialization?: string;
  lg_lead?: string;
  most_recent_contact?: string;
  delta?: number;
  delta_days?: number;
  delta_type?: string;
  no_of_emails?: number;
  no_of_meetings?: number;
  next_scheduled_outreach_date?: string;
  deal_name?: string;
  has_opps?: string;
}

export function TomNewView() {
  const { filters, updateFilters, clearFilters } = useUrlFilters();
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Tom New View (direct table query)
  const { data: rawData, isLoading, error, refetch } = useQuery({
    queryKey: ['tom_new_view'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tom_new_view' as any)
        .select('*')
        .order('most_recent_contact', { ascending: false, nullsFirst: false });
      if (error) throw error;
      console.log('tom row', data?.[0]); // Sanity check
      return data as TomNewViewRow[];
    },
  });

  // Apply client-side filtering
  const data = useMemo(() => {
    if (!rawData) return [];
    
    let filtered = rawData;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row => 
        row.deal_source_company?.toLowerCase().includes(searchLower) ||
        row.deal_source_individual?.toLowerCase().includes(searchLower) ||
        row.deal_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    const dealSources = filters.deal_source_company as string[];
    if (dealSources?.length) {
      filtered = filtered.filter(row => 
        dealSources.includes(row.deal_source_company || '')
      );
    }

    const focusAreas = filters.lg_focus_area as string[];
    if (focusAreas?.length) {
      filtered = filtered.filter(row => 
        focusAreas.some(fa => 
          row.lg_focus_area?.toLowerCase().includes(fa.toLowerCase())
        )
      );
    }

    const leads = filters.lg_lead as string[];
    if (leads?.length) {
      filtered = filtered.filter(row => 
        leads.some(lead => 
          row.lg_lead?.toLowerCase().includes(lead.toLowerCase())
        )
      );
    }

    const deltaMin = filters.delta_min;
    const deltaMax = filters.delta_max;
    if (typeof deltaMin === 'number' && deltaMin !== null) {
      filtered = filtered.filter(row => 
        (row.delta_days || 0) >= deltaMin
      );
    }
    if (typeof deltaMax === 'number' && deltaMax !== null) {
      filtered = filtered.filter(row => 
        (row.delta_days || 0) <= deltaMax
      );
    }

    const deltaTypes = filters.delta_type as string[];
    if (deltaTypes?.length) {
      filtered = filtered.filter(row => 
        deltaTypes.includes(row.delta_type || '')
      );
    }

    const dateStart = filters.outreach_start as string;
    const dateEnd = filters.outreach_end as string;
    if (dateStart) {
      filtered = filtered.filter(row => 
        row.next_scheduled_outreach_date && row.next_scheduled_outreach_date >= dateStart
      );
    }
    if (dateEnd) {
      filtered = filtered.filter(row => 
        row.next_scheduled_outreach_date && row.next_scheduled_outreach_date <= dateEnd
      );
    }

    // Sort by most recent contact
    return filtered.sort((a, b) => {
      const dateA = a.most_recent_contact ? new Date(a.most_recent_contact).getTime() : 0;
      const dateB = b.most_recent_contact ? new Date(b.most_recent_contact).getTime() : 0;
      return dateB - dateA;
    });
  }, [rawData, filters, searchTerm]);

  // Format functions
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '—';
    return num.toLocaleString();
  };

  const formatCell = (value: any) => {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  };

  // Column definitions
  const columns = useMemo(() => [
    {
      key: 'deal_source_company',
      label: 'Deal Source Company',
      width: 180,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatCell(row.deal_source_company),
    },
    {
      key: 'deal_source_individual',
      label: 'Deal Source Individual',
      width: 180,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatCell(row.deal_source_individual),
    },
    {
      key: 'lg_sector',
      label: 'LG Sector',
      width: 150,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatCell(row.lg_sector),
    },
    {
      key: 'lg_focus_area',
      label: 'LG Focus Area',
      width: 180,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatCell(row.lg_focus_area),
    },
    {
      key: 'areas_of_specialization',
      label: 'Areas of Specialization',
      width: 200,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatCell(row.areas_of_specialization),
    },
    {
      key: 'lg_lead',
      label: 'LG Lead',
      width: 150,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatCell(row.lg_lead),
    },
    {
      key: 'most_recent_contact',
      label: 'Most Recent Contact',
      width: 160,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatDate(row.most_recent_contact),
    },
    {
      key: 'delta',
      label: 'Delta',
      width: 100,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatNumber(row.delta),
    },
    {
      key: 'delta_type',
      label: 'Delta Type',
      width: 120,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatCell(row.delta_type),
    },
    {
      key: 'no_of_emails',
      label: 'No of Emails',
      width: 120,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatNumber(row.no_of_emails),
    },
    {
      key: 'no_of_meetings',
      label: 'No of Meetings',
      width: 130,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatNumber(row.no_of_meetings),
    },
    {
      key: 'next_scheduled_outreach_date',
      label: 'Next Scheduled Outreach Date',
      width: 200,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatDate(row.next_scheduled_outreach_date),
    },
    {
      key: 'deal_name',
      label: 'Deal Name',
      width: 180,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : formatCell(row.deal_name),
    },
    {
      key: 'has_opps',
      label: 'Has Opps',
      width: 100,
      sortable: true,
      render: (row: TomNewViewRow) => !row ? '—' : row.has_opps === 'Yes' ? 'Yes' : row.has_opps === 'No' ? 'No' : '—',
    },
  ], []);

  // Export functions
  const handleDownloadCSV = useCallback(() => {
    if (!data?.length) {
      toast({
        title: "No data to export",
        description: "The table is empty or still loading.",
        variant: "destructive",
      });
      return;
    }

    const csvData = data.map(row => ({
      'Deal Source Company': formatCell(row.deal_source_company),
      'Deal Source Individual': formatCell(row.deal_source_individual),
      'LG Sector': formatCell(row.lg_sector),
      'LG Focus Area': formatCell(row.lg_focus_area),
      'Areas of Specialization': formatCell(row.areas_of_specialization),
      'LG Lead': formatCell(row.lg_lead),
      'Most Recent Contact': formatDate(row.most_recent_contact),
      'Delta': formatNumber(row.delta),
      'Delta Type': formatCell(row.delta_type),
      'No of Emails': formatNumber(row.no_of_emails),
      'No of Meetings': formatNumber(row.no_of_meetings),
      'Next Scheduled Outreach Date': formatDate(row.next_scheduled_outreach_date),
      'Deal Name': formatCell(row.deal_name),
      'Has Opps': row.has_opps === 'Yes' ? 'Yes' : row.has_opps === 'No' ? 'No' : '—',
    }));

    const csv = jsonToCsv(csvData);
    downloadFile(csv, `tom-new-view-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
    
    toast({
      title: "Export successful",
      description: `Downloaded ${data.length} records as CSV.`,
    });
  }, [data]);

  const handleCopyJSON = useCallback(async () => {
    if (!data?.length) {
      toast({
        title: "No data to copy",
        description: "The table is empty or still loading.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast({
        title: "Copied to clipboard",
        description: `Copied ${data.length} records as JSON.`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy data to clipboard.",
        variant: "destructive",
      });
    }
  }, [data]);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-background border-b border-border">
        <div className="mx-auto max-w-7xl px-6">
          <PageHeader 
            title="Tom New View"
            description="Combined view of contacts and opportunities for comprehensive relationship tracking"
          />
        </div>
      </div>
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {isLoading ? 'Loading...' : `${data?.length || 0} records`}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={isLoading || !data?.length}
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJSON}
                disabled={isLoading || !data?.length}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy JSON
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl bg-card shadow-sm border border-border overflow-hidden">
            <AdvancedTable
              data={data || []}
              columns={columns}
              loading={isLoading}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              tableId="tom-new-view-table"
              exportFilename={`tom-new-view-${format(new Date(), 'yyyy-MM-dd')}`}
            />
          </div>
        </div>
      </main>

      {/* Filters Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetTrigger asChild>
          <div style={{ display: 'none' }} />
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="delta-min">Delta Min (Days)</Label>
              <Input
                id="delta-min"
                type="number"
                value={(filters.delta_min as any) || ''}
                onChange={(e) => updateFilters({ delta_min: e.target.value ? parseInt(e.target.value) as any : null })}
                placeholder="Minimum delta days"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="delta-max">Delta Max (Days)</Label>
              <Input
                id="delta-max"
                type="number"
                value={(filters.delta_max as any) || ''}
                onChange={(e) => updateFilters({ delta_max: e.target.value ? parseInt(e.target.value) as any : null })}
                placeholder="Maximum delta days"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="outreach-start">Outreach Date Start</Label>
              <Input
                id="outreach-start"
                type="date"
                value={filters.outreach_start as string || ''}
                onChange={(e) => updateFilters({ outreach_start: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="outreach-end">Outreach Date End</Label>
              <Input
                id="outreach-end"
                type="date"
                value={filters.outreach_end as string || ''}
                onChange={(e) => updateFilters({ outreach_end: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={clearFilters} variant="outline" className="flex-1">
                Clear All
              </Button>
              <Button onClick={() => setShowFilters(false)} className="flex-1">
                Apply
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}