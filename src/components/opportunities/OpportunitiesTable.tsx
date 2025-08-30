import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedTable, ColumnDef, TablePreset } from "@/components/shared/AdvancedTable";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { AddOpportunityDialog } from "./AddOpportunityDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchOpportunities();
  }, [sortKey, sortDirection]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("opportunities_app")
        .select("*");

      if (sortKey && sortDirection) {
        query = query.order(sortKey, { 
          ascending: sortDirection === 'asc',
          nullsFirst: false 
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      setOpportunities(data || []);
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

      const statusMatch = selectedStatuses.length === 0 || 
        (opportunity.status && selectedStatuses.includes(opportunity.status));

      const tierMatch = selectedTiers.length === 0 || 
        (opportunity.tier && selectedTiers.includes(opportunity.tier));

      return searchMatch && statusMatch && tierMatch;
    });
  }, [opportunities, searchTerm, selectedStatuses, selectedTiers]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(
      opportunities
        .map(opp => opp.status)
        .filter(Boolean)
    )).sort();
  }, [opportunities]);

  const uniqueTiers = useMemo(() => {
    return Array.from(new Set(
      opportunities
        .map(opp => opp.tier)
        .filter(Boolean)
    )).sort();
  }, [opportunities]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleTier = (tier: string) => {
    setSelectedTiers(prev => 
      prev.includes(tier) 
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  };

  const handleRowClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsDrawerOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "pipeline":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "won":
        return "bg-green-50 text-green-700 border-green-200";
      case "lost":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "tier 1":
      case "1":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "tier 2":
      case "2":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "tier 3":
      case "3":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
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
          <span className="font-medium">{value || "Unnamed Deal"}</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getStatusColor(value)}>
          {value || "—"}
        </Badge>
      )
    },
    {
      key: "tier",
      label: "Tier",
      width: 100,
      minWidth: 80,
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getTierColor(value)}>
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
      label: "LG Focus Area",
      width: 180,
      minWidth: 150,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "platform_add_on",
      label: "Platform Add-On",
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "date_of_origination",
      label: "Date of Origination",
      width: 160,
      minWidth: 140,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "deal_source_company",
      label: "Source Company",
      width: 180,
      minWidth: 150,
      sortable: true,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{value || "No source company"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      key: "deal_source_individual_1",
      label: "Source #1",
      width: 160,
      minWidth: 120,
      sortable: true,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{value || "No primary source individual"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      key: "deal_source_individual_2",
      label: "Source #2",
      width: 160,
      minWidth: 120,
      sortable: true,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{value || "No secondary source individual"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      key: "ownership",
      label: "Ownership",
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "ownership_type",
      label: "Ownership Type",
      width: 140,
      minWidth: 120,
      sortable: true,
      render: (value) => value || "—"
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
      columns: ["deal_name", "status", "tier", "sector", "lg_focus_area", "deal_source_company", "ownership"]
    },
    {
      name: "Wide",
      columns: ["deal_name", "status", "tier", "sector", "lg_focus_area", "platform_add_on", "date_of_origination", "deal_source_company", "deal_source_individual_1", "deal_source_individual_2", "ownership", "ownership_type"]
    }
  ];

  // Active filters for display
  const activeFilters = useMemo(() => {
    const filters: { label: string; onRemove: () => void }[] = [];
    
    selectedStatuses.forEach(status => {
      filters.push({
        label: `Status: ${status}`,
        onRemove: () => toggleStatus(status)
      });
    });

    selectedTiers.forEach(tier => {
      filters.push({
        label: `Tier: ${tier}`,
        onRemove: () => toggleTier(tier)
      });
    });

    return filters;
  }, [selectedStatuses, selectedTiers]);

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedTiers([]);
    setSearchTerm("");
  };

  // Filters component
  const filtersComponent = (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="focus-ring">
            <Filter className="h-4 w-4 mr-2" />
            Status
            {selectedStatuses.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedStatuses.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <h4 className="font-medium">Filter by Status</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {uniqueStatuses.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <label htmlFor={`status-${status}`} className="text-sm">{status}</label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="focus-ring">
            <Filter className="h-4 w-4 mr-2" />
            Tier
            {selectedTiers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedTiers.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <h4 className="font-medium">Filter by Tier</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {uniqueTiers.map((tier) => (
                <div key={tier} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tier-${tier}`}
                    checked={selectedTiers.includes(tier)}
                    onCheckedChange={() => toggleTier(tier)}
                  />
                  <label htmlFor={`tier-${tier}`} className="text-sm">{tier}</label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  const emptyState = {
    title: "No opportunities found",
    description: searchTerm || activeFilters.length > 0 
      ? "Try adjusting your search or filters to find opportunities."
      : "Start tracking your business development by adding your first opportunity.",
    action: <AddOpportunityDialog open={false} onClose={() => {}} onOpportunityAdded={refetch} />
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-section-title">All Opportunities</h3>
          <p className="text-meta mt-1">
            {filteredOpportunities?.length || 0} opportunit{filteredOpportunities?.length !== 1 ? 'ies' : 'y'} total
          </p>
        </div>
      </div>

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
        filters={filtersComponent}
        activeFilters={activeFilters}
        onClearAllFilters={clearAllFilters}
        emptyState={emptyState}
        tableId="opportunities"
        presets={presets}
        exportFilename="opportunities"
      />

      <OpportunityDrawer
        opportunity={selectedOpportunity}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpportunityUpdated={refetch}
      />
    </div>
  );
}