import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { AdvancedTable } from '@/components/shared/AdvancedTable';
import { Button } from '@/components/ui/button';
import { Filter, Download, Copy, Check, ChevronsUpDown, X } from 'lucide-react';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { jsonToCsv, downloadFile } from '@/utils/csvExport';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

// Token utilities for comma-separated fields
const tokenize = (s?: string) =>
  (s ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

const norm = (s: string) => s.toLowerCase();

const matchesAnyToken = (rowVal: string | null, selected: string[]) => {
  if (!selected?.length) return true;
  const rowTokens = tokenize(rowVal).map(norm);
  const selectedNorm = selected.map(norm);
  return selectedNorm.some(tok => rowTokens.includes(tok));
};

interface TomNewViewRow {
  contact_id: string | null;
  deal_source_company: string | null;
  deal_source_individual: string | null;
  lg_sector: string | null;
  lg_focus_area: string | null;
  areas_of_specialization: string | null;
  lg_lead: string | null;
  most_recent_contact: string | null;
  delta: number | null;
  delta_days: number | null;
  delta_type: string | null;
  no_of_emails: number | null;
  no_of_meetings: number | null;
  next_scheduled_outreach_date: string | null;
  deal_name: string | null;
  has_opps: string | null;
  notes?: string;
}

export function TomNewView() {
  const { filters, updateFilters, clearFilters } = useUrlFilters();
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

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
      return data as any;
    },
  });

  // Generate filter options from rawData
  const {
    dsOptions, faOptions, leadOptions, dtOptions
  } = useMemo(() => {
    const ds = new Set<string>(), fa = new Set<string>(), ld = new Set<string>(), dt = new Set<string>();
    (rawData ?? []).forEach(r => {
      if (r?.deal_source_company) ds.add(r.deal_source_company.trim());
      if (r?.delta_type) dt.add(r.delta_type.trim());
      
      // Tokenize comma-separated fields for lg_focus_area and lg_lead
      if (r?.lg_focus_area) {
        tokenize(r.lg_focus_area).forEach(token => fa.add(token));
      }
      if (r?.lg_lead) {
        tokenize(r.lg_lead).forEach(token => ld.add(token));
      }
    });
    const sort = (arr: string[]) => arr.filter(Boolean).sort((a,b)=>a.localeCompare(b));
    return {
      dsOptions: sort([...ds]),
      faOptions: sort([...fa]),
      leadOptions: sort([...ld]),
      dtOptions: sort([...dt]),
    };
  }, [rawData]);

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

    // Deal Source Company (exact match against selected list)
    const selDS = (filters.deal_source_company as string[]) || [];
    if (selDS.length) {
      filtered = filtered.filter(r => selDS.includes(r.deal_source_company || ''));
    }

    // LG Focus Area (match any token)
    const selFA = (filters.lg_focus_area as string[]) || [];
    if (selFA.length) {
      filtered = filtered.filter(r =>
        matchesAnyToken(r.lg_focus_area, selFA)
      );
    }

    // LG Lead (match any token)
    const selLead = (filters.lg_lead as string[]) || [];
    if (selLead.length) {
      filtered = filtered.filter(r =>
        matchesAnyToken(r.lg_lead, selLead)
      );
    }

    // Delta Type (exact match list)
    const selDT = (filters.delta_type as string[]) || [];
    if (selDT.length) {
      filtered = filtered.filter(r => selDT.includes(r.delta_type || ''));
    }

    // Has Opps (single select)
    const hasOpps = (filters.has_opps as 'all' | 'Yes' | 'No') || 'all';
    if (hasOpps === 'Yes') filtered = filtered.filter(r => (r.has_opps || '') === 'Yes');
    if (hasOpps === 'No')  filtered = filtered.filter(r => (r.has_opps || '') === 'No');

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

  // Debug logging to verify keys match
  useEffect(() => { 
    if (rawData?.length) console.table(rawData.slice(0,3)); 
  }, [rawData]);

  // Format functions  
  const dash = (v: unknown) => (v ?? '') === '' || v === null ? '—' : String(v);
  const fmtNum = (n: unknown) => 
    n === null || n === undefined ? '—' : new Intl.NumberFormat().format(Number(n));
  const fmtDate = (iso: string | null) => 
    !iso ? '—' : new Date(iso).toLocaleDateString();

  // Handle email draft generation
  const handleDraft = useCallback(async (row: TomNewViewRow) => {
    try {
      setLoadingId(row.contact_id || null);

      // Try to include notes (strategy A → B)
      let notes = (row as any).notes ?? '';
      if (!notes && row.contact_id) {
        const { data: c, error } = await supabase
          .from('contacts_app')
          .select('notes')
          .eq('id', row.contact_id)
          .maybeSingle();
        if (!error && c?.notes) notes = c.notes;
      }

      const payload = {
        ...row,
        notes,
        requested_by: (await supabase.auth.getUser())?.data?.user?.email || '',
        requested_at: new Date().toISOString(),
        ui_context: { source: 'tom_new_view', model_hint: 'draft-outreach', ui_version: 'v1' }
      };

      await fetch('https://inverisllc.app.n8n.cloud/webhook-test/Email-Draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      toast({ 
        title: 'Draft requested', 
        description: '✨ AI is working on your request. Your draft will arrive in your inbox shortly.' 
      });
    } catch (e) {
      toast({ 
        title: 'Failed to request draft', 
        description: 'Please try again in a moment.', 
        variant: 'destructive' 
      });
    } finally {
      setLoadingId(null);
    }
  }, []);

  // Column definitions - using AdvancedTable format
  const columns = useMemo(() => [
    {
      key: 'deal_source_company',
      label: 'Deal Source Company',
      width: 180,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'deal_source_individual',
      label: 'Deal Source Individual',
      width: 180,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'lg_sector',
      label: 'LG Sector',
      width: 150,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'lg_focus_area',
      label: 'LG Focus Area',
      width: 180,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'areas_of_specialization',
      label: 'Areas of Specialization',
      width: 200,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'lg_lead',
      label: 'LG Lead',
      width: 150,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'most_recent_contact',
      label: 'Most Recent Contact',
      width: 160,
      sortable: true,
      render: (value: any) => fmtDate(value),
    },
    {
      key: 'delta',
      label: 'Delta',
      width: 100,
      sortable: true,
      render: (value: any) => fmtNum(value),
    },
    {
      key: 'delta_days',
      label: 'Delta Days',
      width: 120,
      sortable: true,
      render: (value: any) => fmtNum(value),
    },
    {
      key: 'delta_type',
      label: 'Delta Type',
      width: 120,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'no_of_emails',
      label: 'No of Emails',
      width: 120,
      sortable: true,
      render: (value: any) => fmtNum(value),
    },
    {
      key: 'no_of_meetings',
      label: 'No of Meetings',
      width: 130,
      sortable: true,
      render: (value: any) => fmtNum(value),
    },
    {
      key: 'next_scheduled_outreach_date',
      label: 'Next Scheduled Outreach Date',
      width: 200,
      sortable: true,
      render: (value: any) => fmtDate(value),
    },
    {
      key: 'deal_name',
      label: 'Deal Name',
      width: 180,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'has_opps',
      label: 'Has Opps',
      width: 100,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'contact_id',
      label: 'Contact ID',
      width: 160,
      sortable: true,
      render: (value: any) => dash(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 180,
      render: (value: any, row: TomNewViewRow) => (
        <Button
          size="sm"
          className={`bg-blue-600 hover:bg-blue-700 text-white relative overflow-hidden ${
            loadingId === row.contact_id ? 'ai-sparkle' : ''
          }`}
          disabled={loadingId === row.contact_id}
          onClick={() => handleDraft(row)}
        >
          {loadingId === row.contact_id ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-pulse bg-white/80 rounded-full" />
              Working…
            </span>
          ) : (
            'Generate email draft'
          )}
        </Button>
      ),
    },
  ], [loadingId, handleDraft]);

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
      'Deal Source Company': dash(row.deal_source_company),
      'Deal Source Individual': dash(row.deal_source_individual),
      'LG Sector': dash(row.lg_sector),
      'LG Focus Area': dash(row.lg_focus_area),
      'Areas of Specialization': dash(row.areas_of_specialization),
      'LG Lead': dash(row.lg_lead),
      'Most Recent Contact': fmtDate(row.most_recent_contact),
      'Delta': fmtNum(row.delta),
      'Delta Days': fmtNum(row.delta_days),
      'Delta Type': dash(row.delta_type),
      'No of Emails': fmtNum(row.no_of_emails),
      'No of Meetings': fmtNum(row.no_of_meetings),
      'Next Scheduled Outreach Date': fmtDate(row.next_scheduled_outreach_date),
      'Deal Name': dash(row.deal_name),
      'Has Opps': dash(row.has_opps),
      'Contact ID': dash(row.contact_id),
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

  // Helper function for multi-select toggle
  const toggleMulti = useCallback((key: string, value: string) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateFilters({ ...filters, [key]: next as any });
  }, [filters, updateFilters]);

  // Multi-select component
  const MultiSelect = ({ 
    label, 
    filterKey, 
    options, 
    placeholder 
  }: { 
    label: string; 
    filterKey: string; 
    options: string[]; 
    placeholder: string; 
  }) => {
    const [open, setOpen] = useState(false);
    const selected = (filters[filterKey] as string[]) || [];
    
    return (
      <div className="grid gap-2">
        <Label>{label} {selected.length > 0 && `(${selected.length})`}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between"
            >
              {selected.length > 0 ? `${selected.length} selected` : placeholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option}
                      onSelect={() => toggleMulti(filterKey, option)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected.includes(option) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {selected.map((item) => (
              <Badge key={item} variant="secondary" className="text-xs">
                {item}
                <X
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => toggleMulti(filterKey, item)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        .ai-sparkle:after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent);
          transform: translateX(-100%);
          animation: slide 1.2s infinite;
        }
        @keyframes slide { 
          100% { transform: translateX(100%); } 
        }
      `}</style>
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="Tom New View"
          description="Advanced view for Tom's workflow"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={!data?.length}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 touch-target text-fluid-sm"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Download CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJSON}
                disabled={!data?.length}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 touch-target text-fluid-sm"
              >
                <Copy className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Copy JSON</span>
              </Button>
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 touch-target text-fluid-sm">
                    <Filter className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Filters</span>
                  </Button>
                </SheetTrigger>
            </div>
          </div>
        />
        
      <main className="flex-1">
        <div className="container-fluid py-4 lg:py-6">
          <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-section-title text-foreground">
              Data Overview ({data.length} records)
            </h2>
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
          <div className="grid gap-6 py-4 max-h-[80vh] overflow-y-auto">
            {/* Multi-select Filters */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Multi-Select Filters</h3>
              
              <MultiSelect
                label="Deal Source Company"
                filterKey="deal_source_company"
                options={dsOptions}
                placeholder="Select companies..."
              />
              
              <MultiSelect
                label="LG Focus Area"
                filterKey="lg_focus_area"
                options={faOptions}
                placeholder="Select focus areas..."
              />
              
              <MultiSelect
                label="LG Lead"
                filterKey="lg_lead"
                options={leadOptions}
                placeholder="Select leads..."
              />
              
              <MultiSelect
                label="Delta Type"
                filterKey="delta_type"
                options={dtOptions}
                placeholder="Select delta types..."
              />
              
              {/* Has Opps Radio Group */}
              <div className="grid gap-2">
                <Label>Has Opps</Label>
                <RadioGroup
                  value={(filters.has_opps as string) || 'all'}
                  onValueChange={(value) => updateFilters({ ...filters, has_opps: value as any })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="has-opps-all" />
                    <Label htmlFor="has-opps-all">All</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Yes" id="has-opps-yes" />
                    <Label htmlFor="has-opps-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No" id="has-opps-no" />
                    <Label htmlFor="has-opps-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            {/* Range Filters */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Range Filters</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="delta-min">Delta Min (Days)</Label>
                <Input
                  id="delta-min"
                  type="number"
                  value={(filters.delta_min as any) || ''}
                  onChange={(e) => updateFilters({ ...filters, delta_min: e.target.value ? parseInt(e.target.value) as any : null })}
                  placeholder="Minimum delta days"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="delta-max">Delta Max (Days)</Label>
                <Input
                  id="delta-max"
                  type="number"
                  value={(filters.delta_max as any) || ''}
                  onChange={(e) => updateFilters({ ...filters, delta_max: e.target.value ? parseInt(e.target.value) as any : null })}
                  placeholder="Maximum delta days"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="outreach-start">Outreach Date Start</Label>
                <Input
                  id="outreach-start"
                  type="date"
                  value={filters.outreach_start as string || ''}
                  onChange={(e) => updateFilters({ ...filters, outreach_start: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="outreach-end">Outreach Date End</Label>
                <Input
                  id="outreach-end"
                  type="date"
                  value={filters.outreach_end as string || ''}
                  onChange={(e) => updateFilters({ ...filters, outreach_end: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4 border-t">
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
    </>
  );
}