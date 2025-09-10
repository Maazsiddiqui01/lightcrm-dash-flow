import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedTable, ColumnDef, TablePreset } from "@/components/shared/AdvancedTable";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { AddOpportunityDialog } from "./AddOpportunityDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2 } from "lucide-react";
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
  next_steps: string;
  most_recent_notes: string;
  url: string;
  created_at: string;
  updated_at: string;
  dealcloud: boolean;
}

interface OpportunityFilters {
  focusArea: string[];
  ownershipType: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  tier: string[];
  status: string[];
  sector: string[];
  leads: string[];
  platformAddOn: string[];
  referralContacts: string[];
  referralCompanies: string[];
  dateOfOrigination: string[];
}

interface OpportunitiesTableProps {
  filters: OpportunityFilters;
}

export function OpportunitiesTable({ filters }: OpportunitiesTableProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();

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
      if (filters.focusArea.length > 0) {
        query = query.in('lg_focus_area', filters.focusArea);
      }

      if (filters.sector.length > 0) {
        query = query.in('sector', filters.sector);
      }

      if (filters.tier.length > 0) {
        query = query.in('tier', filters.tier);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.ownershipType.length > 0) {
        query = query.in('ownership_type', filters.ownershipType);
      }

      if (filters.platformAddOn.length > 0) {
        query = query.in('platform_add_on', filters.platformAddOn);
      }

      if (filters.referralCompanies.length > 0) {
        query = query.in('deal_source_company', filters.referralCompanies);
      }

      // LG Lead: match either person #1 or #2
      if (filters.leads.length > 0) {
        const lgQuery = filters.leads.map(lead => 
          `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
        ).join(',');
        query = query.or(lgQuery);
      }

      // Referral Source: match either individual #1 or #2
      if (filters.referralContacts.length > 0) {
        const refQuery = filters.referralContacts.map(ref =>
          `deal_source_individual_1.ilike.%${ref}%,deal_source_individual_2.ilike.%${ref}%`
        ).join(',');
        query = query.or(refQuery);
      }

      // Date of Origination (text contains)
      if (filters.dateOfOrigination.length > 0) {
        const dateQuery = filters.dateOfOrigination.map(date =>
          `date_of_origination.ilike.%${date}%`
        ).join(',');
        query = query.or(dateQuery);
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
      if (filters.ebitdaMin !== undefined || filters.ebitdaMax !== undefined) {
        filteredData = filteredData.filter(opp => {
          const ebitdaText = opp.ebitda;
          if (!ebitdaText) return false;
          
          // Extract number from text using regex
          const match = ebitdaText.match(/[\d,]+\.?\d*/);
          if (!match) return false;
          
          const numValue = parseFloat(match[0].replace(/,/g, ''));
          if (isNaN(numValue)) return false;
          
          let passesMin = true;
          let passesMax = true;
          
          if (filters.ebitdaMin !== undefined) {
            passesMin = numValue >= filters.ebitdaMin;
          }
          
          if (filters.ebitdaMax !== undefined) {
            passesMax = numValue <= filters.ebitdaMax;
          }
          
          return passesMin && passesMax;
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

  const handleRowClick = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsDrawerOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
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
    description: searchTerm 
      ? "Try adjusting your search to find opportunities."
      : "No opportunities match the current filters.",
    action: (
      <Button onClick={() => setIsAddDialogOpen(true)}>
        <Building2 className="h-4 w-4 mr-2" />
        Add Opportunity
      </Button>
    )
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">All Opportunities</h3>
          <p className="text-sm text-muted-foreground">
            {filteredOpportunities?.length || 0} opportunit{filteredOpportunities?.length !== 1 ? 'ies' : 'y'} total
          </p>
        </div>
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