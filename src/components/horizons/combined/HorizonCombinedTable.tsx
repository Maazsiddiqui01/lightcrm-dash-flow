import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaged } from "@/utils/supabaseFetchAll";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { ColumnDef } from "@/components/shared/AdvancedTable";
import { HorizonCompanyDrawer } from "../companies/HorizonCompanyDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ChevronDown, Trash2, Link2, Link2Off, FileText, ListTodo, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { HorizonCombinedFilters } from "./HorizonCombinedFilterBar";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ColumnsMenu } from "@/components/shared/ColumnsMenu";
import { MultiSortDialog, SortLevel, ColumnOption } from "@/components/shared/MultiSortDialog";
import { SortChips } from "@/components/shared/SortChips";
import { 
  loadSortState, 
  saveSortState, 
  clearSortState,
  buildSupabaseOrder,
  applyClientSort 
} from "@/lib/sort/customSort";
import { format } from "date-fns";
import { parseFlexibleDate } from "@/utils/dateUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotesNextStepsDialog } from "@/components/horizons/shared/NotesNextStepsDialog";
import { HorizonCombinedExportDropdown } from "./HorizonCombinedExportDropdown";

interface CombinedCompany {
  id: string;
  priority: number | null;
  company_name: string;
  company_url: string | null;
  sector: string | null;
  subsector: string | null;
  ebitda: string | null;
  ebitda_numeric: number | null;
  revenue: string | null;
  revenue_numeric: number | null;
  ownership: string | null;
  parent_gp_name: string | null;
  parent_gp_id: string | null;
  gp_aum: string | null;
  gp_aum_numeric: number | null;
  lg_relationship: string | null;
  gp_contact: string | null;
  process_status: string | null;
  company_hq_city: string | null;
  company_hq_state: string | null;
  source: string | null;
  description: string | null;
  // Joined GP data
  gp_data?: {
    id: string;
    gp_name: string;
    gp_url: string | null;
    aum: string | null;
    aum_numeric: number | null;
    lg_relationship: string | null;
    gp_contact: string | null;
    fund_hq_city: string | null;
    fund_hq_state: string | null;
    active_funds: number | null;
    total_funds: number | null;
    active_holdings: number | null;
    industry_sector_focus: string | null;
  } | null;
}

interface HorizonCombinedTableProps {
  filters: HorizonCombinedFilters;
  selectedRows?: string[];
  onSelectionChange?: (rows: string[]) => void;
}

export function HorizonCombinedTable({ filters, selectedRows = [], onSelectionChange }: HorizonCombinedTableProps) {
  const [companies, setCompanies] = useState<CombinedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CombinedCompany | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CombinedCompany | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDialogTab, setNotesDialogTab] = useState<"notes" | "next_steps">("notes");
  const [notesDialogRecord, setNotesDialogRecord] = useState<CombinedCompany | null>(null);
  const { toast } = useToast();
  
  const requestIdRef = useRef<string | null>(null);
  
  // Multi-sort state
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  
  // Load sort state on mount
  useEffect(() => {
    const savedSort = loadSortState('lg_horizons_combined');
    setSortLevels(savedSort);
  }, []);
  
  const columnVisibility = useColumnVisibility('columns:lg_horizons_combined');
  
  // Column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => [
    { key: 'priority', label: 'Priority' },
    { key: 'company_name', label: 'Company' },
    { key: 'sector', label: 'Sector' },
    { key: 'subsector', label: 'Subsector' },
    { key: 'ebitda_numeric', label: 'EBITDA' },
    { key: 'revenue_numeric', label: 'Revenue' },
    { key: 'process_status', label: 'Process Status' },
    { key: 'ownership', label: 'Ownership' },
    { key: 'parent_gp_name', label: 'General Partner' },
    { key: 'gp_aum_numeric', label: 'GP AUM' },
    { key: 'lg_relationship', label: 'LG Relationship' },
    { key: 'company_hq_city', label: 'Company City' },
    { key: 'company_hq_state', label: 'Company State' },
    { key: 'source', label: 'Source' },
    { key: 'description', label: 'Company Description' },
  ], []);

  // Format cell value for display
  const formatCellValue = (value: any, type: string): string => {
    if (value === null || value === undefined) return '';
    if (type === 'date' || type === 'timestamp') {
      const date = parseFlexibleDate(value);
      if (date) return format(date, 'MMM dd, yyyy');
    }
    return String(value);
  };

  // Dynamic columns
  const dynamicColumns = useMemo(() => {
    const columns: ColumnDef<CombinedCompany>[] = [
      // Actions column
      {
        key: 'actions',
        label: 'Actions',
        width: 100,
        enableHiding: false,
        render: (value: any, row: CombinedCompany) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8">
                Actions
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async (e) => {
                e.stopPropagation();
                const { error } = await supabase
                  .from('lg_horizons_companies')
                  .update({ priority: 1 })
                  .eq('id', row.id);
                if (error) {
                  toast({ title: "Error", description: "Failed to set priority", variant: "destructive" });
                } else {
                  toast({ title: "Success", description: "Priority set to 1" });
                  fetchCompanies();
                }
              }}
            >
              <Star className="h-4 w-4 mr-2" />
              Set Priority 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCompany(row);
                setIsDrawerOpen(true);
              }}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setNotesDialogRecord(row);
                setNotesDialogTab("notes");
                setNotesDialogOpen(true);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Add Notes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setNotesDialogRecord(row);
                setNotesDialogTab("next_steps");
                setNotesDialogOpen(true);
              }}
            >
              <ListTodo className="h-4 w-4 mr-2" />
              Add Next Steps
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setCompanyToDelete(row);
                setDeleteConfirmOpen(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
      // Priority
      {
        key: 'priority',
        label: 'Priority',
        width: 80,
        visible: columnVisibility.columnVisibility['priority'] !== false,
        enableHiding: true,
        render: (value: any) => {
          if (!value) return null;
          const variants: Record<number, string> = {
            1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
            2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
            3: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
          };
          return <Badge className={variants[value] || ""}>{value}</Badge>;
        },
      },
      // Company Name
      {
        key: 'company_name',
        label: 'Company',
        width: 200,
        visible: columnVisibility.columnVisibility['company_name'] !== false,
        enableHiding: true,
        resizable: true,
        render: (value: any, row: CombinedCompany) => {
          if (row.company_url) {
            return (
              <a 
                href={row.company_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {value}
              </a>
            );
          }
          return <span>{value}</span>;
        },
      },
      // Sector
      {
        key: 'sector',
        label: 'Sector',
        width: 140,
        visible: columnVisibility.columnVisibility['sector'] !== false,
        enableHiding: true,
        resizable: true,
      },
      // EBITDA
      {
        key: 'ebitda',
        label: 'EBITDA',
        width: 100,
        visible: columnVisibility.columnVisibility['ebitda'] !== false,
        enableHiding: true,
      },
      // Revenue
      {
        key: 'revenue',
        label: 'Revenue',
        width: 100,
        visible: columnVisibility.columnVisibility['revenue'] !== false,
        enableHiding: true,
      },
      // Process Status
      {
        key: 'process_status',
        label: 'Process Status',
        width: 140,
        visible: columnVisibility.columnVisibility['process_status'] !== false,
        enableHiding: true,
        render: (value: any) => {
          if (!value) return null;
          const statusLower = String(value).toLowerCase();
          let colorClass = "bg-muted/50 text-muted-foreground border-muted";
          if (statusLower.includes('failed')) {
            colorClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800";
          } else if (statusLower.includes('expected') || statusLower.includes('monitoring')) {
            colorClass = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800";
          } else if (statusLower.includes('no known')) {
            colorClass = "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700";
          }
          return <Badge variant="outline" className={colorClass}>{value}</Badge>;
        },
      },
      // General Partner (hyperlinked to GP URL)
      {
        key: 'parent_gp_name',
        label: 'General Partner',
        width: 180,
        visible: columnVisibility.columnVisibility['parent_gp_name'] !== false,
        enableHiding: true,
        resizable: true,
        render: (value: any, row: CombinedCompany) => {
          const gpName = row.gp_data?.gp_name || value;
          const gpUrl = row.gp_data?.gp_url;
          if (!gpName) return null;
          
          if (gpUrl) {
            return (
              <a 
                href={gpUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {gpName}
              </a>
            );
          }
          return (
            <span className={row.parent_gp_id ? 'text-foreground' : 'text-muted-foreground'}>
              {gpName}
            </span>
          );
        },
      },
      // GP AUM (from joined GP data if available)
      {
        key: 'gp_aum',
        label: 'GP AUM',
        width: 100,
        visible: columnVisibility.columnVisibility['gp_aum'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedCompany) => {
          const aum = row.gp_data?.aum || value;
          return aum || null;
        },
      },
      // LG Relationship (prefer GP's if linked)
      {
        key: 'lg_relationship',
        label: 'LG Relationship',
        width: 140,
        visible: columnVisibility.columnVisibility['lg_relationship'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedCompany) => {
          const relationship = row.gp_data?.lg_relationship || value;
          return relationship || null;
        },
      },
      // GP Contact
      {
        key: 'gp_contact',
        label: 'GP Contact',
        width: 140,
        visible: columnVisibility.columnVisibility['gp_contact'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedCompany) => {
          const contact = row.gp_data?.gp_contact || value;
          return contact || null;
        },
      },
      // Company HQ
      {
        key: 'company_hq',
        label: 'Company HQ',
        width: 140,
        visible: columnVisibility.columnVisibility['company_hq'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedCompany) => {
          const parts = [row.company_hq_city, row.company_hq_state].filter(Boolean);
          return parts.length > 0 ? parts.join(', ') : null;
        },
      },
      // GP HQ (from joined GP data)
      {
        key: 'gp_hq',
        label: 'GP HQ',
        width: 140,
        visible: columnVisibility.columnVisibility['gp_hq'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedCompany) => {
          if (!row.gp_data) return null;
          const parts = [row.gp_data.fund_hq_city, row.gp_data.fund_hq_state].filter(Boolean);
          return parts.length > 0 ? parts.join(', ') : null;
        },
      },
      // GP Active Holdings
      {
        key: 'active_holdings',
        label: 'Active Holdings',
        width: 110,
        visible: columnVisibility.columnVisibility['active_holdings'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedCompany) => {
          return row.gp_data?.active_holdings ?? null;
        },
      },
      // Ownership
      {
        key: 'ownership',
        label: 'Ownership',
        width: 120,
        visible: columnVisibility.columnVisibility['ownership'] !== false,
        enableHiding: true,
      },
      // Source
      {
        key: 'source',
        label: 'Source',
        width: 120,
        visible: columnVisibility.columnVisibility['source'] !== false,
        enableHiding: true,
      },
      // Company Description
      {
        key: 'description',
        label: 'Company Description',
        width: 200,
        visible: columnVisibility.columnVisibility['description'] !== false,
        enableHiding: true,
        resizable: true,
        render: (value: any) => {
          if (!value) return null;
          // Truncate long descriptions
          const text = String(value);
          if (text.length > 100) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{text.slice(0, 100)}...</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    {text}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return <span>{text}</span>;
        },
      },
    ];

    return columns;
  }, [columnVisibility.columnVisibility]);
  
  // Stable key for filters
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  
  useEffect(() => {
    fetchCompanies();
  }, [sortLevels, filtersKey, searchTerm]);

  const fetchCompanies = async () => {
    const requestId = Date.now().toString();
    requestIdRef.current = requestId;
    
    try {
      setLoading(true);
      
      const selectFields = `
        id,
        priority,
        company_name,
        company_url,
        sector,
        subsector,
        ebitda,
        ebitda_numeric,
        revenue,
        revenue_numeric,
        ownership,
        parent_gp_name,
        parent_gp_id,
        gp_aum,
        gp_aum_numeric,
        lg_relationship,
        gp_contact,
        process_status,
        company_hq_city,
        company_hq_state,
        source,
        description,
        gp_data:lg_horizons_gps!parent_gp_id (
          id,
          gp_name,
          gp_url,
          aum,
          aum_numeric,
          lg_relationship,
          gp_contact,
          fund_hq_city,
          fund_hq_state,
          active_funds,
          total_funds,
          active_holdings,
          industry_sector_focus
        )
      `;
      
      // Create a query factory for paged fetching
      const makeQuery = (from: number, to: number) => {
        let query = supabase
          .from("lg_horizons_companies")
          .select(selectFields)
          .range(from, to);

        // Apply common filters
        if (filters.priority.length > 0) {
          const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
          if (vals.length > 0) query = query.in('priority', vals);
        }

        // LG Relationship filter
        if (filters.lgRelationship.length > 0) {
          const hasNoKnownRelationship = filters.lgRelationship.includes('NO_KNOWN_RELATIONSHIP');
          const regularValues = filters.lgRelationship.filter(v => v !== 'NO_KNOWN_RELATIONSHIP');
          
          if (hasNoKnownRelationship && regularValues.length > 0) {
            query = query.or(`lg_relationship.is.null,lg_relationship.eq.,lg_relationship.in.(${regularValues.join(',')})`);
          } else if (hasNoKnownRelationship) {
            query = query.or('lg_relationship.is.null,lg_relationship.eq.');
          } else if (regularValues.length > 0) {
            query = query.in('lg_relationship', regularValues);
          }
        }

        // Company-specific filters
        if (filters.sector.length > 0) query = query.in('sector', filters.sector);
        if (filters.subsector.length > 0) query = query.in('subsector', filters.subsector);
        if (filters.processStatus.length > 0) query = query.in('process_status', filters.processStatus);
        if (filters.ownership.length > 0) query = query.in('ownership', filters.ownership);
        if (filters.companyState.length > 0) query = query.in('company_hq_state', filters.companyState);
        if (filters.companyCity.length > 0) query = query.in('company_hq_city', filters.companyCity);
        if (filters.source.length > 0) query = query.in('source', filters.source);
        if (filters.parentGp.length > 0) query = query.in('parent_gp_name', filters.parentGp);
        if (filters.ebitdaMin != null) query = query.gte('ebitda_numeric', filters.ebitdaMin);
        if (filters.ebitdaMax != null) query = query.lte('ebitda_numeric', filters.ebitdaMax);
        if (filters.revenueMin != null) query = query.gte('revenue_numeric', filters.revenueMin);
        if (filters.revenueMax != null) query = query.lte('revenue_numeric', filters.revenueMax);
        if (filters.gpAumMin != null) query = query.gte('gp_aum_numeric', filters.gpAumMin);
        if (filters.gpAumMax != null) query = query.lte('gp_aum_numeric', filters.gpAumMax);
        if (filters.dateOfAcquisitionStart) query = query.gte('date_of_acquisition', filters.dateOfAcquisitionStart);
        if (filters.dateOfAcquisitionEnd) query = query.lte('date_of_acquisition', filters.dateOfAcquisitionEnd);

        // Search
        if (searchTerm.trim()) {
          query = query.or(`company_name.ilike.%${searchTerm}%,sector.ilike.%${searchTerm}%,parent_gp_name.ilike.%${searchTerm}%`);
        }

        // Apply multi-sort with stable tie-breaker
        const serverOrders = buildSupabaseOrder(sortLevels);
        if (serverOrders.length > 0) {
          serverOrders.forEach(order => {
            query = query.order(order.column, { ascending: order.ascending, nullsFirst: false });
          });
        } else {
          query = query.order('priority', { ascending: true, nullsFirst: false })
                       .order('company_name', { ascending: true });
        }
        // Always add id as final tie-breaker for stable pagination
        query = query.order('id', { ascending: true });
        
        return query;
      };

      const data = await fetchAllPaged<any>(makeQuery);

      if (requestIdRef.current !== requestId) return;

      // Transform data - gp_data comes as array from Supabase, take first element
      const transformedData = data.map(row => ({
        ...row,
        gp_data: Array.isArray(row.gp_data) ? row.gp_data[0] || null : row.gp_data,
      })) as CombinedCompany[];

      // Apply GP-specific filters client-side (since they're on joined data)
      let filteredData = transformedData;
      
      // Combined location filters - match if EITHER company OR GP location matches
      if (filters.combinedCity && filters.combinedCity.length > 0) {
        filteredData = filteredData.filter(c => 
          filters.combinedCity.includes(c.company_hq_city || '') ||
          (c.gp_data && filters.combinedCity.includes(c.gp_data.fund_hq_city || ''))
        );
      }
      if (filters.combinedState && filters.combinedState.length > 0) {
        filteredData = filteredData.filter(c => 
          filters.combinedState.includes(c.company_hq_state || '') ||
          (c.gp_data && filters.combinedState.includes(c.gp_data.fund_hq_state || ''))
        );
      }
      
      if (filters.industrySector.length > 0) {
        filteredData = filteredData.filter(c => 
          c.gp_data && filters.industrySector.some(sector => 
            c.gp_data?.industry_sector_focus?.toLowerCase().includes(sector.toLowerCase())
          )
        );
      }
      if (filters.gpState.length > 0) {
        filteredData = filteredData.filter(c => 
          c.gp_data && filters.gpState.includes(c.gp_data.fund_hq_state || '')
        );
      }
      if (filters.gpCity.length > 0) {
        filteredData = filteredData.filter(c => 
          c.gp_data && filters.gpCity.includes(c.gp_data.fund_hq_city || '')
        );
      }
      if (filters.aumMin != null) {
        filteredData = filteredData.filter(c => 
          c.gp_data && (c.gp_data.aum_numeric || 0) >= filters.aumMin!
        );
      }
      if (filters.aumMax != null) {
        filteredData = filteredData.filter(c => 
          c.gp_data && (c.gp_data.aum_numeric || 0) <= filters.aumMax!
        );
      }

      const sortedData = applyClientSort(filteredData, sortLevels);
      setCompanies(sortedData as CombinedCompany[]);
    } catch (error) {
      console.error("Error fetching combined data:", error);
      toast({ title: "Error", description: "Failed to fetch data.", variant: "destructive" });
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        requestIdRef.current = null;
      }
    }
  };

  const handleRowClick = (company: CombinedCompany) => {
    setSelectedCompany(company);
    setIsDrawerOpen(true);
  };

  const handleSortChange = (newSortLevels: SortLevel[]) => {
    setSortLevels(newSortLevels);
    saveSortState('lg_horizons_combined', newSortLevels);
  };

  const handleClearSort = () => {
    setSortLevels([]);
    clearSortState('lg_horizons_combined');
  };

  const handleDeleteCompany = async (companyId: string) => {
    try {
      const { error } = await supabase.from('lg_horizons_companies').delete().eq('id', companyId);
      if (error) throw error;
      toast({ title: "Success", description: "Company deleted successfully" });
      if (selectedRows.includes(companyId)) {
        onSelectionChange?.(selectedRows.filter(id => id !== companyId));
      }
      await fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({ title: "Error", description: "Failed to delete company.", variant: "destructive" });
    }
  };

  // Count linked vs unlinked
  const linkedCount = companies.filter(c => c.parent_gp_id).length;

  return (
    <div className="space-y-4">
      <SortChips
        sortLevels={sortLevels}
        columns={columnOptions}
        onClear={handleClearSort}
        className="mb-2"
      />

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            {companies.length} Compan{companies.length !== 1 ? 'ies' : 'y'}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({linkedCount} linked to GPs)
            </span>
          </h3>
        </div>
        <div className="flex gap-2">
          <HorizonCombinedExportDropdown data={companies} />
          
          <ColumnsMenu
            columns={dynamicColumns}
            columnVisibility={columnVisibility.columnVisibility}
            onColumnVisibilityChange={columnVisibility.updateColumnVisibility}
            onShowAll={(columns) => columnVisibility.showAllColumns(columns)}
            onHideAll={(columns) => columnVisibility.hideAllColumns(columns)}
          />

          <Button variant="outline" size="sm" onClick={() => setIsSortDialogOpen(true)}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </Button>
        </div>
      </div>

      <ResponsiveAdvancedTable
        tableId="horizon-combined-table"
        data={companies}
        hideExportButton={true}
        columns={dynamicColumns}
        loading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onRowClick={handleRowClick}
        enableResizing={true}
        persistKey="horizon-combined"
        enableColumnReordering={true}
      />

      <MultiSortDialog
        open={isSortDialogOpen}
        onOpenChange={setIsSortDialogOpen}
        columns={columnOptions}
        sortLevels={sortLevels}
        onApply={handleSortChange}
      />

      {selectedCompany && (
        <HorizonCompanyDrawer
          company={selectedCompany as any}
          open={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedCompany(null);
          }}
          onCompanyUpdated={fetchCompanies}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Company"
        description={`Are you sure you want to delete "${companyToDelete?.company_name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          if (companyToDelete) {
            handleDeleteCompany(companyToDelete.id);
          }
          setDeleteConfirmOpen(false);
          setCompanyToDelete(null);
        }}
        variant="destructive"
      />

      {notesDialogRecord && (
        <NotesNextStepsDialog
          open={notesDialogOpen}
          onClose={() => {
            setNotesDialogOpen(false);
            setNotesDialogRecord(null);
          }}
          recordId={notesDialogRecord.id}
          tableName="lg_horizons_companies"
          recordName={notesDialogRecord.company_name}
          initialTab={notesDialogTab}
          onSaved={fetchCompanies}
        />
      )}
    </div>
  );
}
