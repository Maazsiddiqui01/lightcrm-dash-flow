import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { AddOpportunityDialog } from "./AddOpportunityDialog";
import { Button } from "@/components/ui/button";
import { Download, Plus, Briefcase, Mail, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SplitButton } from "@/components/shared/SplitButton";
import { exportCsv } from "@/lib/export/exportService";
import { sendOpportunityEmail } from "@/features/opportunities/sendEmail";

// Dynamic column imports
import { OPPORTUNITIES_RAW_COLUMNS, getTableColumns } from "@/lib/supabase/getTableColumns";
import { createDynamicColumns } from "@/lib/dynamicColumns";
import { useEditMode } from "@/hooks/useEditMode";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ColumnsMenu } from "@/components/shared/ColumnsMenu";
import { EditToolbar } from "@/components/shared/EditToolbar";

// Multi-sort imports
import { MultiSortDialog, SortLevel, ColumnOption } from "@/components/shared/MultiSortDialog";
import { SortChips } from "@/components/shared/SortChips";
import { 
  loadSortState, 
  saveSortState, 
  clearSortState,
  buildSupabaseOrder,
  applyClientSort 
} from "@/lib/sort/customSort";

interface OpportunityRaw {
  id: string;
  deal_name: string | null;
  lg_focus_area: string | null;
  sector: string | null;
  platform_add_on: string | null;
  tier: string | null;
  status: string | null;
  url: string | null;
  summary_of_opportunity: string | null;
  next_steps: string | null;
  most_recent_notes: string | null;
  ebitda: string | null;
  ebitda_in_ms: number | null;
  ebitda_notes: string | null;
  ownership: string | null;
  ownership_type: string | null;
  investment_professional_point_person_1: string | null;
  investment_professional_point_person_2: string | null;
  deal_source_company: string | null;
  deal_source_individual_1: string | null;
  deal_source_individual_2: string | null;
  date_of_origination: string | null;
  dealcloud: boolean | null;
  headquarters: string | null;
  revenue: number | null;
  est_deal_size: number | null;
  est_lg_equity_invest: number | null;
  last_modified: string | null;
  created_at: string | null;
  updated_at: string | null;
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
  headquarters: string[];
}

interface OpportunitiesTableProps {
  filters: OpportunityFilters;
}

export function OpportunitiesTable({ filters }: OpportunitiesTableProps) {
  const [opportunities, setOpportunities] = useState<OpportunityRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityRaw | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  // Add request tracking to prevent race conditions
  const requestIdRef = useRef<string | null>(null);
  
  // Multi-sort state
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  
  // Load sort state on mount
  useEffect(() => {
    const savedSort = loadSortState('opportunities_raw');
    setSortLevels(savedSort);
  }, []);
  
  // Initialize edit mode and column visibility
  const editMode = useEditMode('opportunities_raw', opportunities, setOpportunities);
  const columnVisibility = useColumnVisibility('columns:opportunities_raw');
  
  // Get table columns metadata
  const tableColumns = useMemo(() => getTableColumns('opportunities_raw'), []);
  
  // Create dynamic columns with edit support + Send Email action
  const dynamicColumns = useMemo(() => {
    const baseColumns = createDynamicColumns<OpportunityRaw>(
      tableColumns,
      'opportunities_raw',
      editMode.editState,
      {
        onStartEdit: editMode.startEdit,
        onCommitEdit: editMode.commitEdit,
        onCancelEdit: editMode.cancelEdit,
      },
      columnVisibility.columnVisibility
    );

    // Add the Send Email action column at the end
    const emailColumn = {
      key: 'actions',
      label: 'Actions',
      width: 120,
      enableHiding: false,
      render: (value: any, row: OpportunityRaw) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            handleSendEmail(row);
          }}
          className="h-8"
        >
          <Mail className="h-3 w-3 mr-1" />
          Send Email
        </Button>
      ),
    };

    return [...baseColumns, emailColumn];
  }, [tableColumns, editMode.editState, editMode.startEdit, editMode.commitEdit, editMode.cancelEdit, columnVisibility.columnVisibility]);
  
  // Create column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => {
    return tableColumns.map(col => ({
      key: col.name,
      label: col.displayName,
    }));
  }, [tableColumns]);
  
  // Stable key for filters to avoid effect thrashing on referential changes
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  
  // Debounced effect to prevent rapid re-fetching
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchOpportunities();
    }, 200); // Small delay to batch rapid changes
    
    return () => clearTimeout(timeoutId);
  }, [sortLevels, filtersKey]);

  const fetchOpportunities = async () => {
    // Generate unique request ID to prevent race conditions
    const requestId = Date.now().toString();
    requestIdRef.current = requestId;
    
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

      if (filters.headquarters.length > 0) {
        query = query.in('headquarters', filters.headquarters);
      }

      // LG Leads filter
      if (filters.leads.length > 0) {
        const lgLeadQuery = filters.leads.map(lead => 
          `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
        ).join(',');
        query = query.or(lgLeadQuery);
      }

      // Referral contacts filter
      if (filters.referralContacts.length > 0) {
        const contactQuery = filters.referralContacts.map(contact => 
          `deal_source_individual_1.ilike.%${contact}%,deal_source_individual_2.ilike.%${contact}%`
        ).join(',');
        query = query.or(contactQuery);
      }

      // Referral companies filter
      if (filters.referralCompanies.length > 0) {
        query = query.in('deal_source_company', filters.referralCompanies);
      }

      // EBITDA range filter
      if (filters.ebitdaMin !== null && filters.ebitdaMin !== undefined) {
        query = query.gte('ebitda_in_ms', filters.ebitdaMin);
      }
      if (filters.ebitdaMax !== null && filters.ebitdaMax !== undefined) {
        query = query.lte('ebitda_in_ms', filters.ebitdaMax);
      }

      // Date of origination filter
      if (filters.dateOfOrigination.length > 0) {
        const dateQueries = filters.dateOfOrigination.map(dateRange => {
          const [start, end] = dateRange.split(' to ');
          if (end) {
            return `date_of_origination.gte.${start},date_of_origination.lte.${end}`;
          }
          return `date_of_origination.gte.${start}`;
        });
        query = query.or(dateQueries.join(','));
      }

      // Apply multi-sort (server-side for non-custom orders)
      const serverOrders = buildSupabaseOrder(sortLevels);
      if (serverOrders.length > 0) {
        serverOrders.forEach(order => {
          query = query.order(order.column, { 
            ascending: order.ascending, 
            nullsFirst: false 
          });
        });
      } else if (sortLevels.length === 0) {
        // Fallback to default sort
        query = query.order('created_at', { ascending: false, nullsFirst: false });
      } else {
        // All levels have custom orders, use default for stable pagination
        query = query.order('id', { ascending: true });
      }

      const { data, error } = await query;

      // Check if this request is still current (prevent race conditions)
      if (requestIdRef.current !== requestId) {
        return; // Ignore outdated requests
      }

      if (error) {
        console.error("Error fetching opportunities:", error);
        toast({
          title: "Error",
          description: "Failed to fetch opportunities. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Apply client-side sorting for custom orders
      const sortedData = applyClientSort(data || [], sortLevels);
      setOpportunities(sortedData);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Only set loading to false if this is still the current request
      if (requestIdRef.current === requestId) {
        setLoading(false);
        requestIdRef.current = null;
      }
    }
  };

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opportunity =>
      searchTerm === "" ||
      opportunity.deal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.deal_source_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.deal_source_individual_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.deal_source_individual_2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.sector?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [opportunities, searchTerm]);

  const handleRowClick = (opportunity: OpportunityRaw) => {
    setSelectedOpportunity(opportunity);
    setIsDrawerOpen(true);
  };

  // Handle multi-sort changes
  const handleSortChange = (newSortLevels: SortLevel[]) => {
    setSortLevels(newSortLevels);
    saveSortState('opportunities_raw', newSortLevels);
  };

  // Clear sort
  const handleClearSort = () => {
    setSortLevels([]);
    clearSortState('opportunities_raw');
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleSendEmail = async (opportunity: OpportunityRaw) => {
    try {
      await sendOpportunityEmail(opportunity.id);
      toast({
        title: "Email Sent",
        description: `Email sent for opportunity: ${opportunity.deal_name}`,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Email Failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // New export function using the shared service
  const handleExport = async (mode: 'current' | 'detailed') => {
    setIsExporting(true);
    
    // For now, use all visible columns from the dynamic columns
    const visibleColumns = dynamicColumns
      .filter(col => columnVisibility.columnVisibility[col.key] !== false)
      .map(col => col.key);
    
    const columnHeaders = Object.fromEntries(
      dynamicColumns.map(col => [col.key, col.label])
    );

    try {
      await exportCsv({
        page: 'opportunities',
        mode,
        selectedIds: undefined, // No selection support yet
        filters: { searchTerm },
        sortLevels,
        visibleColumns,
        columnHeaders
      });
    } finally {
      setIsExporting(false);
    }
  };

  const editedRowsCount = Object.keys(editMode.editState.editedRows).length;

  return (
    <div className="space-y-4">
      {/* Edit Toolbar */}
      <EditToolbar
        editMode={editMode.editState.editMode}
        onToggleEditMode={editMode.toggleEditMode}
        editedRowsCount={editedRowsCount}
        onSave={editMode.saveChanges}
        onDiscard={editMode.discardChanges}
        isSaving={editMode.isSaving}
      />

      {/* Sort Chips */}
      <SortChips
        sortLevels={sortLevels}
        columns={columnOptions}
        onClear={handleClearSort}
        className="mb-2"
      />

      {/* Header with actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            {filteredOpportunities.length} Opportunit{filteredOpportunities.length !== 1 ? 'ies' : 'y'}
          </h3>
        </div>
        <div className="flex gap-2">
          <ColumnsMenu
            columns={dynamicColumns}
            columnVisibility={columnVisibility.columnVisibility}
            onColumnVisibilityChange={columnVisibility.updateColumnVisibility}
            onShowAll={(columns) => columnVisibility.showAllColumns(columns)}
            onHideAll={(columns) => columnVisibility.hideAllColumns(columns)}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSortDialogOpen(true)}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </Button>
          
          <SplitButton
            label="Export"
            primaryAction={() => handleExport('current')}
            menu={[
              { label: 'Detailed (all columns)', onClick: () => handleExport('detailed') }
            ]}
            disabled={isExporting}
            loading={isExporting}
            icon={<Download className="h-4 w-4" />}
          />

          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Opportunity
          </Button>
        </div>
      </div>

      {/* Dynamic Table */}
      <ResponsiveAdvancedTable
        data={filteredOpportunities}
        columns={dynamicColumns}
        loading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={handleRowClick}
        editMode={editMode.editState.editMode} // Pass edit mode state
        emptyState={{
          title: "No opportunities found",
          description: "Try adjusting your search or filters to find opportunities.",
        }}
        enableRowSelection={true}
        idKey="id"
        initialPageSize={50}
        tableId="opportunities-table"
        tableType="opportunities"
        hideColumnsButton={true}
      />

      {/* Drawers and Dialogs */}
      <OpportunityDrawer
        opportunity={selectedOpportunity}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpportunityUpdated={fetchOpportunities}
      />

      <AddOpportunityDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onOpportunityAdded={() => {
          fetchOpportunities();
          setIsAddDialogOpen(false);
        }}
      />

      {/* Multi-Sort Dialog */}
      <MultiSortDialog
        open={isSortDialogOpen}
        onOpenChange={setIsSortDialogOpen}
        columns={columnOptions}
        sortLevels={sortLevels}
        onApply={handleSortChange}
      />
    </div>
  );
}