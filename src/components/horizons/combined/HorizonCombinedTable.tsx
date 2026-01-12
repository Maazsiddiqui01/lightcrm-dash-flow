import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPaged } from "@/utils/supabaseFetchAll";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { ColumnDef } from "@/components/shared/AdvancedTable";
import { HorizonCompanyDrawer } from "../companies/HorizonCompanyDrawer";
import { HorizonGpDrawer } from "../gps/HorizonGpDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ChevronDown, Trash2, Link2, Link2Off, FileText, ListTodo, Star, Building2, Users2 } from "lucide-react";
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

// Unified row type for combined display of both GPs and Companies
interface CombinedRow {
  id: string;
  record_type: 'company' | 'gp';
  name: string;
  name_url: string | null;
  priority: number | null;
  sector: string | null;
  subsector: string | null;
  lg_relationship: string | null;
  city: string | null;
  state: string | null;
  aum: string | null;
  aum_numeric: number | null;
  // Company-specific (null for GPs)
  ebitda: string | null;
  ebitda_numeric: number | null;
  revenue: string | null;
  revenue_numeric: number | null;
  process_status: string | null;
  ownership: string | null;
  parent_gp_name: string | null;
  parent_gp_id: string | null;
  parent_gp_url: string | null;
  date_of_acquisition: string | null;
  source: string | null;
  description: string | null;
  // GP-specific (null for companies)
  active_funds: number | null;
  active_holdings: number | null;
  total_funds: number | null;
  industry_sector_focus: string | null;
  gp_contact: string | null;
  // Original data reference for drawer
  original_data: any;
}

interface HorizonCombinedTableProps {
  filters: HorizonCombinedFilters;
  selectedRows?: string[];
  onSelectionChange?: (rows: string[]) => void;
}

export function HorizonCombinedTable({ filters, selectedRows = [], onSelectionChange }: HorizonCombinedTableProps) {
  const [data, setData] = useState<CombinedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedRow, setSelectedRow] = useState<CombinedRow | null>(null);
  const [isCompanyDrawerOpen, setIsCompanyDrawerOpen] = useState(false);
  const [isGpDrawerOpen, setIsGpDrawerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<CombinedRow | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesDialogTab, setNotesDialogTab] = useState<"notes" | "next_steps">("notes");
  const [notesDialogRecord, setNotesDialogRecord] = useState<CombinedRow | null>(null);
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
  
  // Debounce search term to prevent table resets on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const columnVisibility = useColumnVisibility('columns:lg_horizons_combined');
  
  // Column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => [
    { key: 'record_type', label: 'Type' },
    { key: 'priority', label: 'Priority' },
    { key: 'name', label: 'Name' },
    { key: 'sector', label: 'Sector' },
    { key: 'subsector', label: 'Subsector' },
    { key: 'ebitda_numeric', label: 'EBITDA' },
    { key: 'revenue_numeric', label: 'Revenue' },
    { key: 'process_status', label: 'Process Status' },
    { key: 'ownership', label: 'Ownership' },
    { key: 'parent_gp_name', label: 'General Partner' },
    { key: 'aum_numeric', label: 'AUM' },
    { key: 'lg_relationship', label: 'LG Relationship' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'source', label: 'Source' },
    { key: 'description', label: 'Description' },
    { key: 'date_of_acquisition', label: 'Acquisition Date' },
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
    const columns: ColumnDef<CombinedRow>[] = [
      // Actions column
      {
        key: 'actions',
        label: 'Actions',
        width: 100,
        enableHiding: false,
        render: (value: any, row: CombinedRow) => (
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
                const tableName = row.record_type === 'company' ? 'lg_horizons_companies' : 'lg_horizons_gps';
                const { error } = await supabase
                  .from(tableName)
                  .update({ priority: 1 })
                  .eq('id', row.id);
                if (error) {
                  toast({ title: "Error", description: "Failed to set priority", variant: "destructive" });
                } else {
                  toast({ title: "Success", description: "Priority set to 1" });
                  fetchData();
                }
              }}
            >
              <Star className="h-4 w-4 mr-2" />
              Set Priority 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(row);
                if (row.record_type === 'company') {
                  setIsCompanyDrawerOpen(true);
                } else {
                  setIsGpDrawerOpen(true);
                }
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
                setRowToDelete(row);
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
      // Type indicator
      {
        key: 'record_type',
        label: 'Type',
        width: 90,
        visible: columnVisibility.columnVisibility['record_type'] !== false,
        enableHiding: true,
        render: (value: any) => {
          if (value === 'company') {
            return (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
                <Building2 className="h-3 w-3 mr-1" />
                Company
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800">
              <Users2 className="h-3 w-3 mr-1" />
              GP
            </Badge>
          );
        },
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
      // Name (Company or GP name)
      {
        key: 'name',
        label: 'Name',
        width: 200,
        visible: columnVisibility.columnVisibility['name'] !== false,
        enableHiding: true,
        resizable: true,
        render: (value: any, row: CombinedRow) => {
          if (row.name_url) {
            return (
              <a 
                href={row.name_url} 
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
      // EBITDA (Company only)
      {
        key: 'ebitda',
        label: 'EBITDA',
        width: 100,
        visible: columnVisibility.columnVisibility['ebitda'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'gp') return <span className="text-muted-foreground">—</span>;
          return value || null;
        },
      },
      // Revenue (Company only)
      {
        key: 'revenue',
        label: 'Revenue',
        width: 100,
        visible: columnVisibility.columnVisibility['revenue'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'gp') return <span className="text-muted-foreground">—</span>;
          return value || null;
        },
      },
      // Process Status (Company only)
      {
        key: 'process_status',
        label: 'Process Status',
        width: 140,
        visible: columnVisibility.columnVisibility['process_status'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'gp') return <span className="text-muted-foreground">—</span>;
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
      // General Partner (Company only - shows linked GP)
      {
        key: 'parent_gp_name',
        label: 'General Partner',
        width: 180,
        visible: columnVisibility.columnVisibility['parent_gp_name'] !== false,
        enableHiding: true,
        resizable: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'gp') return <span className="text-muted-foreground">—</span>;
          if (!value) return null;
          
          if (row.parent_gp_url) {
            return (
              <a 
                href={row.parent_gp_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {value}
              </a>
            );
          }
          return (
            <span className={row.parent_gp_id ? 'text-foreground' : 'text-muted-foreground'}>
              {value}
            </span>
          );
        },
      },
      // AUM
      {
        key: 'aum',
        label: 'AUM',
        width: 100,
        visible: columnVisibility.columnVisibility['aum'] !== false,
        enableHiding: true,
      },
      // LG Relationship
      {
        key: 'lg_relationship',
        label: 'LG Relationship',
        width: 140,
        visible: columnVisibility.columnVisibility['lg_relationship'] !== false,
        enableHiding: true,
      },
      // GP Contact (GP only)
      {
        key: 'gp_contact',
        label: 'GP Contact',
        width: 140,
        visible: columnVisibility.columnVisibility['gp_contact'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'company') return <span className="text-muted-foreground">—</span>;
          return value || null;
        },
      },
      // HQ Location (unified city, state)
      {
        key: 'location',
        label: 'HQ Location',
        width: 140,
        visible: columnVisibility.columnVisibility['location'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          const parts = [row.city, row.state].filter(Boolean);
          return parts.length > 0 ? parts.join(', ') : null;
        },
      },
      // Active Holdings (GP only)
      {
        key: 'active_holdings',
        label: 'Active Holdings',
        width: 110,
        visible: columnVisibility.columnVisibility['active_holdings'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'company') return <span className="text-muted-foreground">—</span>;
          return value ?? null;
        },
      },
      // Active Funds (GP only)
      {
        key: 'active_funds',
        label: 'Active Funds',
        width: 100,
        visible: columnVisibility.columnVisibility['active_funds'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'company') return <span className="text-muted-foreground">—</span>;
          return value ?? null;
        },
      },
      // Ownership (Company only)
      {
        key: 'ownership',
        label: 'Ownership',
        width: 120,
        visible: columnVisibility.columnVisibility['ownership'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'gp') return <span className="text-muted-foreground">—</span>;
          return value || null;
        },
      },
      // Source (Company only)
      {
        key: 'source',
        label: 'Source',
        width: 120,
        visible: columnVisibility.columnVisibility['source'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'gp') return <span className="text-muted-foreground">—</span>;
          return value || null;
        },
      },
      // Date of Acquisition (Company only)
      {
        key: 'date_of_acquisition',
        label: 'Acquisition Date',
        width: 130,
        visible: columnVisibility.columnVisibility['date_of_acquisition'] !== false,
        enableHiding: true,
        render: (value: any, row: CombinedRow) => {
          if (row.record_type === 'gp') return <span className="text-muted-foreground">—</span>;
          if (!value) return null;
          const date = parseFlexibleDate(value);
          if (date) return format(date, 'MMM dd, yyyy');
          return String(value);
        },
      },
      // Description
      {
        key: 'description',
        label: 'Description',
        width: 200,
        visible: columnVisibility.columnVisibility['description'] !== false,
        enableHiding: true,
        resizable: true,
        render: (value: any) => {
          if (!value) return null;
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
    fetchData();
  }, [sortLevels, filtersKey, debouncedSearchTerm]);

  // Check if any GP-specific filters are active
  const hasGpFilters = useMemo(() => {
    return (
      (filters.industrySector && filters.industrySector.length > 0) ||
      (filters.gpState && filters.gpState.length > 0) ||
      (filters.gpCity && filters.gpCity.length > 0) ||
      filters.aumMin != null ||
      filters.aumMax != null
    );
  }, [filters]);

  // Check if any Company-specific filters are active
  const hasCompanyFilters = useMemo(() => {
    return (
      (filters.sector && filters.sector.length > 0) ||
      (filters.subsector && filters.subsector.length > 0) ||
      (filters.processStatus && filters.processStatus.length > 0) ||
      (filters.ownership && filters.ownership.length > 0) ||
      (filters.companyState && filters.companyState.length > 0) ||
      (filters.companyCity && filters.companyCity.length > 0) ||
      (filters.source && filters.source.length > 0) ||
      (filters.parentGp && filters.parentGp.length > 0) ||
      filters.ebitdaMin != null ||
      filters.ebitdaMax != null ||
      filters.revenueMin != null ||
      filters.revenueMax != null ||
      filters.dateOfAcquisitionStart != null ||
      filters.dateOfAcquisitionEnd != null
    );
  }, [filters]);

  const fetchData = async () => {
    const requestId = Date.now().toString();
    requestIdRef.current = requestId;
    
    try {
      setLoading(true);
      
      // Fetch Companies and GPs independently, then combine as UNION
      const [companyRows, gpRows] = await Promise.all([
        fetchCompanies(),
        fetchGps()
      ]);

      if (requestIdRef.current !== requestId) return;

      // Combine both into unified format (UNION)
      const combined = [...companyRows, ...gpRows];
      
      // Apply sorting
      const sortedData = applyClientSort(combined, sortLevels);
      setData(sortedData as CombinedRow[]);
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

  // Fetch Companies - applies ONLY company-specific + common filters
  const fetchCompanies = async (): Promise<CombinedRow[]> => {
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
      date_of_acquisition,
      gp_data:lg_horizons_gps!parent_gp_id (
        id,
        gp_name,
        gp_url,
        aum,
        aum_numeric,
        lg_relationship,
        gp_contact
      )
    `;
    
    const makeQuery = (from: number, to: number) => {
      let query = supabase
        .from("lg_horizons_companies")
        .select(selectFields)
        .range(from, to);

      // Common filters
      if (filters.priority.length > 0) {
        const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
        if (vals.length > 0) query = query.in('priority', vals);
      }

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

      // Search
      if (debouncedSearchTerm.trim()) {
        query = query.or(`company_name.ilike.%${debouncedSearchTerm}%,sector.ilike.%${debouncedSearchTerm}%,parent_gp_name.ilike.%${debouncedSearchTerm}%`);
      }

      query = query.order('id', { ascending: true });
      
      return query;
    };

    const rawData = await fetchAllPaged<any>(makeQuery);

    // Transform and apply client-side filters
    let companies = rawData.map(row => ({
      ...row,
      gp_data: Array.isArray(row.gp_data) ? row.gp_data[0] || null : row.gp_data,
    }));

    // Combined location filters - match if EITHER company OR GP location matches
    if (filters.combinedCity && filters.combinedCity.length > 0) {
      companies = companies.filter(c => 
        filters.combinedCity.includes(c.company_hq_city || '') ||
        (c.gp_data && filters.combinedCity.includes(c.gp_data.fund_hq_city || ''))
      );
    }
    if (filters.combinedState && filters.combinedState.length > 0) {
      companies = companies.filter(c => 
        filters.combinedState.includes(c.company_hq_state || '') ||
        (c.gp_data && filters.combinedState.includes(c.gp_data.fund_hq_state || ''))
      );
    }

    // Date of acquisition filter - client-side because it's stored as text
    if (filters.dateOfAcquisitionStart) {
      const startDate = parseFlexibleDate(filters.dateOfAcquisitionStart);
      if (startDate) {
        companies = companies.filter(c => {
          if (!c.date_of_acquisition) return false;
          const acqDate = parseFlexibleDate(c.date_of_acquisition);
          return acqDate && acqDate >= startDate;
        });
      }
    }
    if (filters.dateOfAcquisitionEnd) {
      const endDate = parseFlexibleDate(filters.dateOfAcquisitionEnd);
      if (endDate) {
        companies = companies.filter(c => {
          if (!c.date_of_acquisition) return false;
          const acqDate = parseFlexibleDate(c.date_of_acquisition);
          return acqDate && acqDate <= endDate;
        });
      }
    }

    // Transform to unified CombinedRow format
    return companies.map((c): CombinedRow => ({
      id: c.id,
      record_type: 'company',
      name: c.company_name,
      name_url: c.company_url,
      priority: c.priority,
      sector: c.sector,
      subsector: c.subsector,
      lg_relationship: c.gp_data?.lg_relationship || c.lg_relationship,
      city: c.company_hq_city,
      state: c.company_hq_state,
      aum: c.gp_data?.aum || c.gp_aum,
      aum_numeric: c.gp_data?.aum_numeric || c.gp_aum_numeric,
      ebitda: c.ebitda,
      ebitda_numeric: c.ebitda_numeric,
      revenue: c.revenue,
      revenue_numeric: c.revenue_numeric,
      process_status: c.process_status,
      ownership: c.ownership,
      parent_gp_name: c.gp_data?.gp_name || c.parent_gp_name,
      parent_gp_id: c.parent_gp_id,
      parent_gp_url: c.gp_data?.gp_url || null,
      date_of_acquisition: c.date_of_acquisition,
      source: c.source,
      description: c.description,
      active_funds: null,
      active_holdings: null,
      total_funds: null,
      industry_sector_focus: null,
      gp_contact: c.gp_data?.gp_contact || c.gp_contact,
      original_data: c,
    }));
  };

  // Fetch GPs - applies ONLY GP-specific + common filters
  const fetchGps = async (): Promise<CombinedRow[]> => {
    const selectFields = `
      id,
      priority,
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
      industry_sector_focus,
      description
    `;
    
    const makeQuery = (from: number, to: number) => {
      let query = supabase
        .from("lg_horizons_gps")
        .select(selectFields)
        .range(from, to);

      // Common filters
      if (filters.priority.length > 0) {
        const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
        if (vals.length > 0) query = query.in('priority', vals);
      }

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

      // GP-specific filters
      if (filters.industrySector && filters.industrySector.length > 0) {
        const conditions = filters.industrySector.map(sector => `industry_sector_focus.ilike.%${sector}%`).join(',');
        query = query.or(conditions);
      }
      if (filters.gpState && filters.gpState.length > 0) query = query.in('fund_hq_state', filters.gpState);
      if (filters.gpCity && filters.gpCity.length > 0) query = query.in('fund_hq_city', filters.gpCity);
      if (filters.aumMin != null) query = query.gte('aum_numeric', filters.aumMin);
      if (filters.aumMax != null) query = query.lte('aum_numeric', filters.aumMax);

      // Search
      if (debouncedSearchTerm.trim()) {
        query = query.or(`gp_name.ilike.%${debouncedSearchTerm}%,industry_sector_focus.ilike.%${debouncedSearchTerm}%`);
      }

      query = query.order('id', { ascending: true });
      
      return query;
    };

    const rawData = await fetchAllPaged<any>(makeQuery);

    // Apply combined location filters client-side
    let gps = rawData;
    
    if (filters.combinedCity && filters.combinedCity.length > 0) {
      gps = gps.filter(g => filters.combinedCity.includes(g.fund_hq_city || ''));
    }
    if (filters.combinedState && filters.combinedState.length > 0) {
      gps = gps.filter(g => filters.combinedState.includes(g.fund_hq_state || ''));
    }

    // Transform to unified CombinedRow format
    return gps.map((g): CombinedRow => ({
      id: g.id,
      record_type: 'gp',
      name: g.gp_name,
      name_url: g.gp_url,
      priority: g.priority,
      sector: g.industry_sector_focus, // Use industry sector as the sector display
      subsector: null,
      lg_relationship: g.lg_relationship,
      city: g.fund_hq_city,
      state: g.fund_hq_state,
      aum: g.aum,
      aum_numeric: g.aum_numeric,
      ebitda: null,
      ebitda_numeric: null,
      revenue: null,
      revenue_numeric: null,
      process_status: null,
      ownership: null,
      parent_gp_name: null,
      parent_gp_id: null,
      parent_gp_url: null,
      date_of_acquisition: null,
      source: null,
      description: g.description,
      active_funds: g.active_funds,
      active_holdings: g.active_holdings,
      total_funds: g.total_funds,
      industry_sector_focus: g.industry_sector_focus,
      gp_contact: g.gp_contact,
      original_data: g,
    }));
  };

  const handleRowClick = (row: CombinedRow) => {
    setSelectedRow(row);
    if (row.record_type === 'company') {
      setIsCompanyDrawerOpen(true);
    } else {
      setIsGpDrawerOpen(true);
    }
  };

  const handleSortChange = (newSortLevels: SortLevel[]) => {
    setSortLevels(newSortLevels);
    saveSortState('lg_horizons_combined', newSortLevels);
  };

  const handleClearSort = () => {
    setSortLevels([]);
    clearSortState('lg_horizons_combined');
  };

  const handleDeleteRow = async (row: CombinedRow) => {
    try {
      const tableName = row.record_type === 'company' ? 'lg_horizons_companies' : 'lg_horizons_gps';
      const { error } = await supabase.from(tableName).delete().eq('id', row.id);
      if (error) throw error;
      toast({ title: "Success", description: `${row.record_type === 'company' ? 'Company' : 'GP'} deleted successfully` });
      if (selectedRows.includes(row.id)) {
        onSelectionChange?.(selectedRows.filter(id => id !== row.id));
      }
      await fetchData();
    } catch (error) {
      console.error('Error deleting row:', error);
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  // Count companies and GPs
  const companyCount = data.filter(r => r.record_type === 'company').length;
  const gpCount = data.filter(r => r.record_type === 'gp').length;

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
            {data.length} Record{data.length !== 1 ? 's' : ''}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({companyCount} Companies, {gpCount} GPs)
            </span>
          </h3>
        </div>
        <div className="flex gap-2">
          <HorizonCombinedExportDropdown data={data as any} />
          
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
        data={data}
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

      {selectedRow && selectedRow.record_type === 'company' && (
        <HorizonCompanyDrawer
          company={selectedRow.original_data as any}
          open={isCompanyDrawerOpen}
          onClose={() => {
            setIsCompanyDrawerOpen(false);
            setSelectedRow(null);
          }}
          onCompanyUpdated={fetchData}
        />
      )}

      {selectedRow && selectedRow.record_type === 'gp' && (
        <HorizonGpDrawer
          gp={selectedRow.original_data as any}
          open={isGpDrawerOpen}
          onClose={() => {
            setIsGpDrawerOpen(false);
            setSelectedRow(null);
          }}
          onGpUpdated={fetchData}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${rowToDelete?.record_type === 'company' ? 'Company' : 'GP'}`}
        description={`Are you sure you want to delete "${rowToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          if (rowToDelete) {
            handleDeleteRow(rowToDelete);
          }
          setDeleteConfirmOpen(false);
          setRowToDelete(null);
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
          tableName={notesDialogRecord.record_type === 'company' ? 'lg_horizons_companies' : 'lg_horizons_gps'}
          recordName={notesDialogRecord.name}
          initialTab={notesDialogTab}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
