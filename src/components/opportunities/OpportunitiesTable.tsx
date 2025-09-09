import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedTable, ColumnDef, TablePreset } from "@/components/shared/AdvancedTable";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { AddOpportunityDialog } from "./AddOpportunityDialog";
import { FilterModal, ActiveFilters } from "@/components/shared/FilterModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useDistinctValues } from "@/hooks/useDistinctValues";

interface Opportunity {
  id: string;
  deal_name: string;
  status: string;
  tier: string;
  sector: string;
  lg_focus_area: string;
  platform_add_on: string;
  date_of_origination: string;
  deal_source_company: string;
  deal_source_individual_1: string;
  deal_source_individual_2: string;
  ownership: string;
  ownership_type: string;
  summary_of_opportunity: string;
  ebitda_in_ms: number;
  ebitda: string;
  ebitda_notes: string;
  investment_professional_point_person_1: string;
  investment_professional_point_person_2: string;
  most_recent_notes: string;
  url: string;
  created_at: string;
  updated_at: string;
  dealcloud: boolean;
}

export function OpportunitiesTable() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();

  // Advanced filters
  const { filters, updateFilters, clearFilters, removeFilter } = useUrlFilters({
    focusAreas: [],
    sectors: [],
    tiers: [],
    platformAddOns: [],
    ownershipTypes: [],
    lgLeads: [],
    dealSourceCompanies: [],
    referralSources: [],
    dateOfOrigination: '',
    statuses: [],
    ebitda: null
  });

  // Fetch distinct values for filters
  const { values: focusAreaOptions } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'lg_focus_area'
  });

  const { values: sectorOptions } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'sector'
  });

  const { values: tierOptions } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'tier'
  });

  const { values: platformAddOnOptions } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'platform_add_on'
  });

  const { values: ownershipTypeOptions } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'ownership_type'
  });

  const { values: statusOptions } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'status'
  });

  const { values: dealSourceCompanyOptions } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'deal_source_company'
  });

  // Get LG Lead options (from both point person columns)
  const { values: lgLead1Options } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'investment_professional_point_person_1'
  });

  const { values: lgLead2Options } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'investment_professional_point_person_2'
  });

  // Get referral source options (from both individual columns)
  const { values: referral1Options } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'deal_source_individual_1'
  });

  const { values: referral2Options } = useDistinctValues({
    table: 'opportunities_raw',
    column: 'deal_source_individual_2'
  });

  // Combine LG Lead and referral source options
  const lgLeadOptions = useMemo(() => {
    const combined = [...lgLead1Options, ...lgLead2Options];
    const unique = Array.from(new Set(combined.map(opt => opt.value)))
      .map(value => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return unique;
  }, [lgLead1Options, lgLead2Options]);

  const referralSourceOptions = useMemo(() => {
    const combined = [...referral1Options, ...referral2Options];
    const unique = Array.from(new Set(combined.map(opt => opt.value)))
      .map(value => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return unique;
  }, [referral1Options, referral2Options]);

  useEffect(() => {
    fetchOpportunities();
  }, [sortKey, sortDirection, filters]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("opportunities_raw")
        .select("*");

      // Apply filters
      const focusAreas = filters.focusAreas as string[] || [];
      const sectors = filters.sectors as string[] || [];
      const tiers = filters.tiers as string[] || [];
      const platformAddOns = filters.platformAddOns as string[] || [];
      const ownershipTypes = filters.ownershipTypes as string[] || [];
      const statuses = filters.statuses as string[] || [];
      const lgLeads = filters.lgLeads as string[] || [];
      const dealSourceCompanies = filters.dealSourceCompanies as string[] || [];
      const referralSources = filters.referralSources as string[] || [];
      const dateOfOrigination = filters.dateOfOrigination as string || '';

      if (focusAreas.length > 0) {
        query = query.in('lg_focus_area', focusAreas);
      }

      if (sectors.length > 0) {
        query = query.in('sector', sectors);
      }

      if (tiers.length > 0) {
        query = query.in('tier', tiers);
      }

      if (platformAddOns.length > 0) {
        query = query.in('platform_add_on', platformAddOns);
      }

      if (ownershipTypes.length > 0) {
        query = query.in('ownership_type', ownershipTypes);
      }

      if (statuses.length > 0) {
        query = query.in('status', statuses);
      }

      if (dealSourceCompanies.length > 0) {
        query = query.in('deal_source_company', dealSourceCompanies);
      }

      // LG Lead: match either person #1 or #2
      if (lgLeads.length > 0) {
        const lgQuery = lgLeads.map(lead => 
          `investment_professional_point_person_1.eq.${lead},investment_professional_point_person_2.eq.${lead}`
        ).join(',');
        query = query.or(lgQuery);
      }

      // Referral Source: match either individual #1 or #2
      if (referralSources.length > 0) {
        const refQuery = referralSources.map(ref =>
          `deal_source_individual_1.eq.${ref},deal_source_individual_2.eq.${ref}`
        ).join(',');
        query = query.or(refQuery);
      }

      // Date of Origination (text contains)
      if (dateOfOrigination) {
        query = query.ilike('date_of_origination', `%${dateOfOrigination}%`);
      }

      if (sortKey && sortDirection) {
        query = query.order(sortKey, { 
          ascending: sortDirection === 'asc',
          nullsFirst: false 
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let filteredData = data || [];

      // Client-side EBITDA filtering (since it's a text field with numbers)
      const ebitdaFilter = filters.ebitda as { operator: '>=' | '<='; value: number } | null;
      if (ebitdaFilter && ebitdaFilter.value !== null) {
        filteredData = filteredData.filter(opp => {
          const ebitdaText = opp.ebitda;
          if (!ebitdaText) return false;
          
          // Extract number from text using regex
          const match = ebitdaText.match(/[\d,]+\.?\d*/);
          if (!match) return false;
          
          const numValue = parseFloat(match[0].replace(/,/g, ''));
          if (isNaN(numValue)) return false;
          
          return ebitdaFilter.operator === '>=' 
            ? numValue >= ebitdaFilter.value
            : numValue <= ebitdaFilter.value;
        });
      }

      setOpportunities(filteredData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load opportunities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchOpportunities();
  };

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opportunity) => {
      const searchMatch = searchTerm === "" || 
        opportunity.deal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opportunity.deal_source_company?.toLowerCase().includes(searchTerm.toLowerCase());

      return searchMatch;
    });
  }, [opportunities, searchTerm]);

  // Create filter field definitions
  const filterFields = [
    {
      key: 'focusAreas',
      label: 'Focus Area',
      type: 'multi-select' as const,
      options: focusAreaOptions,
      searchable: true,
      placeholder: 'Select focus areas...'
    },
    {
      key: 'sectors',
      label: 'Sector',
      type: 'multi-select' as const,
      options: sectorOptions,
      searchable: true,
      placeholder: 'Select sectors...'
    },
    {
      key: 'tiers',
      label: 'Tier',
      type: 'multi-select' as const,
      options: tierOptions,
      searchable: true,
      placeholder: 'Select tiers...'
    },
    {
      key: 'platformAddOns',
      label: 'Platform Add-On',
      type: 'multi-select' as const,
      options: platformAddOnOptions,
      searchable: true,
      placeholder: 'Select platform add-ons...'
    },
    {
      key: 'ebitda',
      label: 'EBITDA',
      type: 'number-compare' as const,
      placeholder: 'Enter EBITDA threshold...'
    },
    {
      key: 'ownershipTypes',
      label: 'Ownership Type',
      type: 'multi-select' as const,
      options: ownershipTypeOptions,
      searchable: true,
      placeholder: 'Select ownership types...'
    },
    {
      key: 'lgLeads',
      label: 'LG Lead',
      type: 'multi-select' as const,
      options: lgLeadOptions,
      searchable: true,
      placeholder: 'Select LG leads...'
    },
    {
      key: 'dealSourceCompanies',
      label: 'Deal Source Company',
      type: 'multi-select' as const,
      options: dealSourceCompanyOptions,
      searchable: true,
      placeholder: 'Select deal source companies...'
    },
    {
      key: 'referralSources',
      label: 'Referral Source',
      type: 'multi-select' as const,
      options: referralSourceOptions,
      searchable: true,
      placeholder: 'Select referral sources...'
    },
    {
      key: 'dateOfOrigination',
      label: 'Date of Origination',
      type: 'text' as const,
      placeholder: 'Search date (e.g., Q1, 2023, Jan)...'
    },
    {
      key: 'statuses',
      label: 'Status',
      type: 'multi-select' as const,
      options: statusOptions,
      searchable: true,
      placeholder: 'Select statuses...'
    }
  ];

  // Create active filter chips
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string }> = [];
    
    const focusAreas = filters.focusAreas as string[] || [];
    focusAreas.forEach(fa => chips.push({ key: 'focusAreas', label: 'Focus Area', value: fa }));
    
    const sectors = filters.sectors as string[] || [];
    sectors.forEach(sector => chips.push({ key: 'sectors', label: 'Sector', value: sector }));
    
    const tiers = filters.tiers as string[] || [];
    tiers.forEach(tier => chips.push({ key: 'tiers', label: 'Tier', value: tier }));
    
    const platformAddOns = filters.platformAddOns as string[] || [];
    platformAddOns.forEach(addon => chips.push({ key: 'platformAddOns', label: 'Platform Add-On', value: addon }));
    
    const ownershipTypes = filters.ownershipTypes as string[] || [];
    ownershipTypes.forEach(type => chips.push({ key: 'ownershipTypes', label: 'Ownership Type', value: type }));
    
    const lgLeads = filters.lgLeads as string[] || [];
    lgLeads.forEach(lead => chips.push({ key: 'lgLeads', label: 'LG Lead', value: lead }));
    
    const dealSourceCompanies = filters.dealSourceCompanies as string[] || [];
    dealSourceCompanies.forEach(company => chips.push({ key: 'dealSourceCompanies', label: 'Deal Source Company', value: company }));
    
    const referralSources = filters.referralSources as string[] || [];
    referralSources.forEach(source => chips.push({ key: 'referralSources', label: 'Referral Source', value: source }));
    
    const statuses = filters.statuses as string[] || [];
    statuses.forEach(status => chips.push({ key: 'statuses', label: 'Status', value: status }));
    
    const dateOfOrigination = filters.dateOfOrigination as string || '';
    if (dateOfOrigination) {
      chips.push({ key: 'dateOfOrigination', label: 'Date of Origination', value: dateOfOrigination });
    }
    
    const ebitda = filters.ebitda as { operator: '>=' | '<='; value: number } | null;
    if (ebitda && ebitda.value !== null) {
      chips.push({ key: 'ebitda', label: 'EBITDA', value: `${ebitda.operator} ${ebitda.value}` });
    }
    
    return chips;
  }, [filters]);

  const activeFilterCount = activeFilterChips.length;

  const handleRowClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsDrawerOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleApplyFilters = () => {
    // Filters are already applied through useEffect dependency on filters
  };

  const handleRemoveFilter = (key: string, value?: string) => {
    removeFilter(key, value);
  };

  // Column definitions
  const columns: ColumnDef<Opportunity>[] = [
    {
      key: "deal_name",
      label: "Deal Name",
      sticky: true,
      width: 200,
      minWidth: 150,
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{value || "Untitled Deal"}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => {
        const statusColors = {
          "Active": "bg-green-50 text-green-700 border-green-200",
          "Closed": "bg-gray-50 text-gray-700 border-gray-200",
          "Hold": "bg-yellow-50 text-yellow-700 border-yellow-200",
          "Pass": "bg-red-50 text-red-700 border-red-200"
        };
        const colorClass = statusColors[value as keyof typeof statusColors] || "bg-gray-50 text-gray-700 border-gray-200";
        return (
          <Badge variant="secondary" className={colorClass}>
            {value || "Unknown"}
          </Badge>
        );
      }
    },
    {
      key: "tier",
      label: "Tier",
      width: 80,
      minWidth: 60,
      sortable: true,
      render: (value) => (
        <Badge variant="outline">
          {value || "—"}
        </Badge>
      )
    },
    {
      key: "sector",
      label: "Sector",
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "lg_focus_area",
      label: "Focus Area",
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "date_of_origination",
      label: "Origination",
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "deal_source_company",
      label: "Source Company",
      width: 180,
      minWidth: 150,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "ebitda",
      label: "EBITDA",
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{value || "No EBITDA data"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
  ];

  // Table presets
  const presets: TablePreset[] = [
    {
      name: "Compact",
      columns: ["deal_name", "status", "tier", "sector", "date_of_origination"]
    },
    {
      name: "Standard",
      columns: ["deal_name", "status", "tier", "sector", "lg_focus_area", "deal_source_company", "date_of_origination"]
    },
    {
      name: "Wide",
      columns: ["deal_name", "status", "tier", "sector", "lg_focus_area", "deal_source_company", "date_of_origination", "ebitda"]
    }
  ];

  const emptyState = {
    title: "No opportunities found",
    description: searchTerm || activeFilterCount > 0
      ? "Try adjusting your search or filters to find opportunities."
      : "Start tracking investment opportunities by adding your first deal.",
    action: (
      <Button onClick={() => setIsAddDialogOpen(true)}>
        <Building2 className="h-4 w-4 mr-2" />
        Add Opportunity
      </Button>
    )
  };

  return (
    <>
      {/* Filters */}
      <div className="p-4 space-y-4 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">All Opportunities</h3>
            <p className="text-sm text-muted-foreground">
              {filteredOpportunities?.length || 0} opportunit{filteredOpportunities?.length !== 1 ? 'ies' : 'y'} total
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <FilterModal
              title="Opportunity Filters"
              fields={filterFields}
              values={filters}
              onValuesChange={updateFilters}
              onApply={handleApplyFilters}
              onClearAll={clearFilters}
              activeFilterCount={activeFilterCount}
            >
              <Button variant="outline" className="focus-ring">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </FilterModal>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterChips.length > 0 && (
          <div className="bg-muted rounded-lg p-4 border border-border">
            <ActiveFilters
              filters={activeFilterChips}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={clearFilters}
            />
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AdvancedTable
          data={filteredOpportunities}
          columns={columns}
          loading={loading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onRowClick={handleRowClick}
          onSort={handleSort}
          sortKey={sortKey}
          sortDirection={sortDirection}
          emptyState={{
            title: "No opportunities found", 
            description: "Try adjusting your search or filters"
          }}
          tableId="opportunities"
          exportFilename="opportunities"
          tableType="opportunities"
          stickyFirstColumn={true}
          initialPageSize={50}
          className="h-full"
          enableRowSelection={true}
          idKey="id"
        />
      </div>
      <OpportunityDrawer
        opportunity={selectedOpportunity}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpportunityUpdated={refetch}
      />

      <AddOpportunityDialog 
        open={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)} 
        onOpportunityAdded={() => {
          setIsAddDialogOpen(false);
          refetch();
        }} 
      />
    </>
  );
}