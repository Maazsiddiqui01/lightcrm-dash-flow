import { useState, useEffect, useMemo, useRef } from "react";
import { TableHeader } from "@/components/shared/TableHeader";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { AddOpportunityDialog } from "./AddOpportunityDialog";
import { BulkImportModal } from "@/components/data-maintenance/BulkImportModal";
import { ExportDropdown } from "./ExportDropdown";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Mail, ArrowUpDown, ChevronDown, FileText, PlusCircle, Upload, Trash2, Paperclip, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { DEBOUNCE } from "@/config/performance";
import { SplitButton } from "@/components/shared/SplitButton";
import { sendOpportunityEmail } from "@/features/opportunities/sendEmail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickAddModal } from "./QuickAddModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AttachmentUploadDialog } from "@/components/attachments/AttachmentUploadDialog";
import { FullHistoryDialog, TimelineItem } from "@/components/shared/FullHistoryDialog";
import { useOpportunityNotes } from "@/hooks/useOpportunityNotes";

// Dynamic column imports
import { OPPORTUNITIES_RAW_COLUMNS, getTableColumns } from "@/lib/supabase/getTableColumns";
import { createDynamicColumns } from "@/lib/dynamicColumns";
import { useEditMode } from "@/hooks/useEditMode";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ColumnsMenu } from "@/components/shared/ColumnsMenu";
import { EditToolbar } from "@/components/shared/EditToolbar";
import { useDynamicEditOptions } from "@/hooks/useDynamicEditOptions";

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
  url: string | null;
  summary_of_opportunity: string | null;
  next_steps: string | null;
  most_recent_notes: string | null;
  
  ebitda_in_ms: number | null;
  ebitda_notes: string | null;
  ownership: string | null;
  ownership_type: string | null;
  investment_professional_point_person_1: string | null;
  investment_professional_point_person_2: string | null;
  investment_professional_point_person_3: string | null;
  investment_professional_point_person_4: string | null;
  lg_team: string | null;
  acquisition_date: string | null;
  deal_source_company: string | null;
  deal_source_individual_1: string | null;
  deal_source_individual_2: string | null;
  date_of_origination: string | null;
  process_timeline?: string | null;
  dealcloud: boolean | null;
  priority: boolean | null;
  headquarters: string | null;
  revenue: number | null;
  est_deal_size: number | null;
  est_lg_equity_invest: number | null;
  last_modified: string | null;
  created_at: string | null;
  updated_at: string | null;
  funds: string | null;
}

interface OpportunityFilters {
  focusArea: string[];
  ownershipType: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  tier: string[];
  sector: string[];
  leads: string[];
  platformAddOn: string[];
  referralContacts: string[];
  referralCompanies: string[];
  dateOfOrigination: string[];
  headquarters: string[];
  processTimeline: string[];
  funds: string[];
  dealcloud: string[];
  priority: string[];
  acquisitionDateStart?: Date;
  acquisitionDateEnd?: Date;
}

interface OpportunitiesTableProps {
  filters: OpportunityFilters;
  selectedRows?: string[];
  onSelectionChange?: (rows: string[]) => void;
}

export function OpportunitiesTable({ filters, selectedRows = [], onSelectionChange }: OpportunitiesTableProps) {
  const [opportunities, setOpportunities] = useState<OpportunityRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityRaw | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'next_steps' | 'most_recent_notes'>('next_steps');
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachmentOpportunity, setAttachmentOpportunity] = useState<{ id: string; name: string } | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyOpportunity, setHistoryOpportunity] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<OpportunityRaw | null>(null);
  
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
  const dynamicEditOptions = useDynamicEditOptions();
  
  // Get table columns metadata - ensure it's always an array
  const tableColumns = useMemo(() => {
    const columns = getTableColumns('opportunities_raw');
    // Defensive check: ensure we always return an array
    if (!Array.isArray(columns)) {
      console.error('getTableColumns did not return an array, falling back to hardcoded columns');
      return OPPORTUNITIES_RAW_COLUMNS;
    }
    return columns;
  }, []);
  
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
      columnVisibility.columnVisibility,
      {
        sectors: dynamicEditOptions.sectors,
        focusAreas: dynamicEditOptions.focusAreas,
      }
    );

    // Override display for notes fields to use display values from timeline
    const columnsWithDisplayOverrides = baseColumns.map(col => {
      if (col.key === 'next_steps') {
        return {
          ...col,
          render: (value: any, row: any) => row.next_steps_display || '',
        };
      }
      if (col.key === 'most_recent_notes') {
        return {
          ...col,
          render: (value: any, row: any) => row.notes_display || '',
        };
      }
      if (col.key === 'next_steps_due_date') {
        return {
          ...col,
          render: (value: any, row: any) => row.next_steps_due_date_display || '',
        };
      }
      return col;
    });

    // Add the Actions dropdown column at the end
    const actionsColumn = {
      key: 'actions',
      label: 'Actions',
      width: 120,
      enableHiding: false,
      render: (value: any, row: OpportunityRaw) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <Mail className="h-3 w-3 mr-1" />
              Actions
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleSendEmail(row);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
               Draft Email
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setAttachmentOpportunity({ id: row.id, name: row.deal_name || 'Unknown' });
                setAttachmentDialogOpen(true);
              }}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Upload Document
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setHistoryOpportunity({ id: row.id, name: row.deal_name || 'Unknown' });
                setHistoryDialogOpen(true);
              }}
            >
              <History className="h-4 w-4 mr-2" />
              View Full History
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOpportunity(row);
                setQuickAddType('next_steps');
                setIsQuickAddModalOpen(true);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Next Step
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOpportunity(row);
                setQuickAddType('most_recent_notes');
                setIsQuickAddModalOpen(true);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Add New Note
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setOpportunityToDelete(row);
                setDeleteConfirmOpen(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Opportunity
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    };

    return [actionsColumn, ...columnsWithDisplayOverrides];
  }, [tableColumns, editMode.editState, editMode.startEdit, editMode.commitEdit, editMode.cancelEdit, columnVisibility.columnVisibility, dynamicEditOptions.sectors, dynamicEditOptions.focusAreas]);
  
  // Create column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => {
    return tableColumns.map(col => ({
      key: col.name,
      label: col.displayName,
    }));
  }, [tableColumns]);
  
  // Stable key for filters to avoid effect thrashing on referential changes
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  
  // Effect to fetch opportunities when filters, sort, or search changes
  useEffect(() => {
    fetchOpportunities();
  }, [sortLevels, filtersKey, searchTerm]);

  const fetchOpportunities = async () => {
    // Generate unique request ID to prevent race conditions
    const requestId = Date.now().toString();
    requestIdRef.current = requestId;
    
    try {
      // Distinguish between initial load and search/filter changes
      const isInitialLoad = opportunities.length === 0;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsSearching(true);
      }
      let query = supabase
        .from("opportunities_with_display_fields")
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

      if (filters.ownershipType.length > 0) {
        query = query.in('ownership_type', filters.ownershipType);
      }

      if (filters.platformAddOn.length > 0) {
        // Convert display values to database values
        const { getPlatformAddonDatabaseValue } = await import('@/lib/export/opportunityUtils');
        const dbValues = filters.platformAddOn.map(v => getPlatformAddonDatabaseValue(v));
        query = query.in('platform_add_on', dbValues);
      }

      // Headquarters filter
      if (filters.headquarters.length > 0) {
        query = query.in('headquarters', filters.headquarters);
      }

      // Funds filter
      if (filters.funds.length > 0) {
        query = query.in('funds', filters.funds);
      }

      // Acquisition date filter
      if (filters.acquisitionDateStart) {
        query = query.gte('acquisition_date', filters.acquisitionDateStart.toISOString().split('T')[0]);
      }
      if (filters.acquisitionDateEnd) {
        query = query.lte('acquisition_date', filters.acquisitionDateEnd.toISOString().split('T')[0]);
      }

      // Process Timeline filter - applied client-side to avoid TS inference issues
      // Server-side filtering commented out due to TypeScript compilation issues
      // Will be applied on retrieved data instead

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

      // Full-text search across multiple fields (server-side)
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase().trim();
        query = query.or(
          `deal_name.ilike.%${searchLower}%,` +
          `summary_of_opportunity.ilike.%${searchLower}%,` +
          `deal_source_company.ilike.%${searchLower}%,` +
          `deal_source_individual_1.ilike.%${searchLower}%,` +
          `deal_source_individual_2.ilike.%${searchLower}%,` +
          `sector.ilike.%${searchLower}%,` +
          `most_recent_notes.ilike.%${searchLower}%,` +
          `next_steps.ilike.%${searchLower}%,` +
          `lg_focus_area.ilike.%${searchLower}%`
        );
      }

      // Date of origination filter - support quarters, years, and partial matching
      if (filters.dateOfOrigination.length > 0) {
        const dateConditions = filters.dateOfOrigination.map(dateValue => {
          // Check if it's a date range (contains " to ")
          if (dateValue.includes(' to ')) {
            const [start, end] = dateValue.split(' to ');
            return `date_of_origination.gte.${start},date_of_origination.lte.${end}`;
          }
          
          // Check if it's a year-only value (e.g., "2024")
          // Use partial matching so "2024" matches "2024", "Q1 2024", "Q2 2024", etc.
          if (/^\d{4}$/.test(dateValue)) {
            return `date_of_origination.ilike.%${dateValue}%`;
          }
          
          // Otherwise treat as exact match (for "Q1 2024", "Q2 2025", etc.)
          return `date_of_origination.eq.${dateValue}`;
        });
        query = query.or(dateConditions.join(','));
      }

      // Process Timeline filter - now optimized on backend
      if (filters.processTimeline.length > 0) {
        query = query.in('process_timeline', filters.processTimeline);
      }

      // Dealcloud filter
      if (filters.dealcloud && filters.dealcloud.length > 0 && filters.dealcloud.length < 2) {
        const boolValue = filters.dealcloud[0] === 'Yes';
        query = query.eq('dealcloud', boolValue);
      }

      // Priority filter
      if (filters.priority && filters.priority.length === 1) {
        const priorityValue = filters.priority[0] === 'Yes';
        // Cast to any to prevent deep type instantiation error
        query = (query as any).eq('priority', priorityValue);
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
      
      setOpportunities(sortedData as any as OpportunityRaw[]);
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
        setIsSearching(false);
        requestIdRef.current = null;
      }
    }
  };

  // No longer needed - search is now server-side
  const filteredOpportunities = opportunities;

  const handleRowClick = (opportunity: OpportunityRaw) => {
    setSelectedOpportunity(opportunity);
    setIsDrawerOpen(true);
  };

  const handleRowDoubleClick = (opportunity: OpportunityRaw) => {
    // If not already in edit mode, enter edit mode
    if (!editMode.editState.editMode) {
      editMode.toggleEditMode();
    }
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

  const handleDeleteOpportunity = async (opportunityId: string) => {
    try {
      const { error } = await supabase
        .from('opportunities_raw')
        .delete()
        .eq('id', opportunityId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity deleted successfully",
      });

      // Clear selection if the deleted row was selected
      if (selectedRows.includes(opportunityId)) {
        onSelectionChange?.(selectedRows.filter(id => id !== opportunityId));
      }

      // Refresh the table
      await fetchOpportunities();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to delete opportunity. Please try again.",
        variant: "destructive",
      });
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
          <ExportDropdown
            data={filteredOpportunities}
            selectedRows={new Set(selectedRows)}
            filters={{ ...filters, searchTerm }}
            visibleColumns={dynamicColumns
              .filter(col => col.key !== 'actions' && columnVisibility.columnVisibility[col.key] !== false)
              .map(col => col.key)}
          />
          
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
            label="Add Opportunity"
            primaryAction={() => setIsAddDialogOpen(true)}
            menu={[
              { 
                label: 'Import CSV/Excel', 
                onClick: () => setIsImportModalOpen(true)
              }
            ]}
            icon={<Plus className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Dynamic Table */}
      <ResponsiveAdvancedTable
        data={filteredOpportunities}
        hideExportButton={true}
        columns={dynamicColumns}
        loading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={handleRowClick}
        onRowDoubleClick={handleRowDoubleClick}
        editMode={editMode.editState.editMode} // Pass edit mode state
        emptyState={{
          title: "No opportunities found",
          description: "Try adjusting your search or filters to find opportunities.",
        }}
        enableRowSelection={true}
        selectedRows={selectedRows}
        onSelectionChange={onSelectionChange}
        idKey="id"
        initialPageSize={50}
        tableId="opportunities-table"
        tableType="opportunities"
        hideColumnsButton={true}
        enableResizing={true}
        persistKey="opportunities"
        enableColumnReordering={true}
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

      {/* Quick Add Modal */}
      <QuickAddModal
        open={isQuickAddModalOpen}
        onOpenChange={setIsQuickAddModalOpen}
        opportunityId={selectedOpportunity?.id || ''}
        type={quickAddType}
        opportunityName={selectedOpportunity?.deal_name || ''}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        entityType="opportunities"
        onImportComplete={() => fetchOpportunities()}
      />

      {/* Attachment Upload Dialog */}
      {attachmentOpportunity && (
        <AttachmentUploadDialog
          open={attachmentDialogOpen}
          onOpenChange={setAttachmentDialogOpen}
          entityType="opportunity"
          entityId={attachmentOpportunity.id}
          entityName={attachmentOpportunity.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => {
          if (opportunityToDelete) {
            handleDeleteOpportunity(opportunityToDelete.id);
          }
          setDeleteConfirmOpen(false);
          setOpportunityToDelete(null);
        }}
        title="Delete Opportunity"
        description={`Are you sure you want to delete "${opportunityToDelete?.deal_name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Full History Dialog */}
      {historyOpportunity && (
        <OpportunityFullHistoryWrapper
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          opportunityId={historyOpportunity.id}
          opportunityName={historyOpportunity.name}
        />
      )}
    </div>
  );
}

// Wrapper component to fetch opportunity history data
function OpportunityFullHistoryWrapper({
  open,
  onOpenChange,
  opportunityId,
  opportunityName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  opportunityName: string;
}) {
  const { timeline } = useOpportunityNotes(opportunityId);

  const formattedTimeline: TimelineItem[] = useMemo(() => {
    return (timeline || []).map((item) => ({
      field: item.field,
      content: item.content,
      created_at: item.created_at,
      created_by: item.created_by,
      due_date: item.due_date,
    }));
  }, [timeline]);

  return (
    <FullHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`History for ${opportunityName}`}
      description="View all notes and next steps for this opportunity"
      timeline={formattedTimeline}
      fieldLabels={{
        next_steps: "Next Steps",
        most_recent_notes: "Notes",
      }}
    />
  );
}