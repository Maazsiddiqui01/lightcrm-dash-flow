import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { AddOpportunityDialog } from "./AddOpportunityDialog";
import { Button } from "@/components/ui/button";
import { Download, Plus, Briefcase, Mail, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { jsonToCsv, downloadFile } from "@/utils/csvExport";
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
  
  useEffect(() => {
    fetchOpportunities();
  }, [sortLevels, filters]);

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
      setLoading(false);
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

  // Export functions
  const exportSummaryCsv = async () => {
    setIsExporting(true);
    try {
      // Apply same sorting to export data
      const exportOpportunities = applyClientSort(filteredOpportunities, sortLevels);
      
      const exportData = exportOpportunities.map(opp => ({
        'Deal Name': opp.deal_name || '',
        'Status': opp.status || '',
        'Tier': opp.tier || '',
        'Sector': opp.sector || '',
        'LG Focus Area': opp.lg_focus_area || '',
        'Platform Add-on': opp.platform_add_on || '',
        'Ownership Type': opp.ownership_type || '',
        'Deal Source Company': opp.deal_source_company || '',
        'Deal Source Individual 1': opp.deal_source_individual_1 || '',
        'Deal Source Individual 2': opp.deal_source_individual_2 || '',
        'Date of Origination': opp.date_of_origination || '',
        'EBITDA (MS)': opp.ebitda_in_ms || 0,
        'IP Point Person 1': opp.investment_professional_point_person_1 || '',
        'IP Point Person 2': opp.investment_professional_point_person_2 || '',
      }));

      const csv = jsonToCsv(exportData);
      downloadFile(csv, `opportunities-summary-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} opportunities to CSV.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export opportunities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailedCsv = async () => {
    setIsExporting(true);
    try {
      // Apply same sorting to export data
      const exportOpportunities = applyClientSort(filteredOpportunities, sortLevels);
      
      // Export all columns from opportunities_raw
      const csv = jsonToCsv(exportOpportunities);
      downloadFile(csv, `opportunities-detailed-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportOpportunities.length} opportunities with all details to CSV.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export detailed opportunities. Please try again.",
        variant: "destructive",
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
            onShowAll={columnVisibility.showAllColumns}
            onHideAll={columnVisibility.hideAllColumns}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSortDialogOpen(true)}
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportSummaryCsv}>
                Summary CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportDetailedCsv}>
                Detailed CSV (All Columns)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
        emptyState={{
          title: "No opportunities found",
          description: "Try adjusting your search or filters to find opportunities.",
        }}
        enableRowSelection={true}
        idKey="id"
        initialPageSize={25}
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