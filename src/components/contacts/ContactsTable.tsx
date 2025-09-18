import { useState, useEffect, useMemo } from "react";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";
import { Button } from "@/components/ui/button";
import { Download, Plus, User, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SplitButton } from "@/components/shared/SplitButton";
import { exportCsv } from "@/lib/export/exportService";

// Dynamic column imports
import { CONTACTS_RAW_COLUMNS, getTableColumns } from "@/lib/supabase/getTableColumns";
import { createDynamicColumns } from "@/lib/dynamicColumns";
import { useEditMode } from "@/hooks/useEditMode";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ColumnsMenu } from "@/components/shared/ColumnsMenu";
import { EditToolbar } from "@/components/shared/EditToolbar";
import { useContactsWithOpportunities } from "@/hooks/useContactsWithOpportunities";

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

interface ContactRaw {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  phone: string | null;
  title: string | null;
  organization: string | null;
  areas_of_specialization: string | null;
  lg_sector: string | null;
  lg_focus_area_1: string | null;
  lg_focus_area_2: string | null;
  lg_focus_area_3: string | null;
  lg_focus_area_4: string | null;
  lg_focus_area_5: string | null;
  lg_focus_area_6: string | null;
  lg_focus_area_7: string | null;
  lg_focus_area_8: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  category: string | null;
  contact_type: string | null;
  delta_type: string | null;
  notes: string | null;
  url_to_online_bio: string | null;
  most_recent_contact: string | null;
  latest_contact_email: string | null;
  latest_contact_meeting: string | null;
  outreach_date: string | null;
  email_subject: string | null;
  meeting_title: string | null;
  total_of_contacts: number | null;
  of_emails: number | null;
  of_meetings: number | null;
  delta: number | null;
  days_since_last_email: number | null;
  days_since_last_meeting: number | null;
  no_of_lg_focus_areas: number | null;
  all_opps: number | null;
  no_of_opps_sourced: number | null;
  email_from: string | null;
  email_to: string | null;
  email_cc: string | null;
  meeting_from: string | null;
  meeting_to: string | null;
  meeting_cc: string | null;
  all_emails: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
  updated_at: string | null;
  opportunities: string; // Comma-separated deal names
}

interface ContactsTableProps {
  filters?: {
    focusAreas?: string[];
    sectors?: string[];
    areasOfSpecialization?: string[];
    organizations?: string[];
    titles?: string[];
    categories?: string[];
    deltaType?: string[];
    hasOpportunities?: string[];
    mostRecentContactStart?: string;
    mostRecentContactEnd?: string;
    deltaMin?: number;
    deltaMax?: number;
    opportunityFilters?: {
      tier?: string[];
      platformAddon?: string[];
      ownershipType?: string[];
      status?: string[];
      lgLead?: string[];
      dateRangeStart?: string;
      dateRangeEnd?: string;
    };
  };
  onOpportunityColumnVisibilityChange?: (visible: boolean) => void;
}

export function ContactsTable({ filters: externalFilters = {}, onOpportunityColumnVisibilityChange }: ContactsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactRaw | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("most_recent_contact");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  // Multi-sort state
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  
  // Load sort state on mount
  useEffect(() => {
    const savedSort = loadSortState('contacts_raw');
    setSortLevels(savedSort);
  }, []);

  // Use the new hook to get contacts with opportunities
  const { contacts, loading, refetch } = useContactsWithOpportunities(externalFilters);
  
  // Create a setContacts function for compatibility with editMode
  const setContacts = () => {
    refetch();
  };
  
  // Initialize edit mode and column visibility
  const editMode = useEditMode('contacts_raw', contacts, setContacts);
  const columnVisibility = useColumnVisibility('columns:contacts_raw');

  // Track opportunities column visibility and notify parent
  useEffect(() => {
    const isOpportunitiesVisible = columnVisibility.columnVisibility['opportunities'] !== false;
    onOpportunityColumnVisibilityChange?.(isOpportunitiesVisible);
  }, [columnVisibility.columnVisibility, onOpportunityColumnVisibilityChange]);
  
  // Get table columns metadata and add opportunities column
  const tableColumns = useMemo(() => {
    const baseColumns = getTableColumns('contacts_raw');
    const opportunitiesColumn = {
      name: 'opportunities',
      type: 'text',
      nullable: true,
      displayName: 'Opportunities'
    };
    return [...baseColumns, opportunitiesColumn];
  }, []);
  
  // Create dynamic columns with edit support
  const dynamicColumns = useMemo(() => {
    return createDynamicColumns<ContactRaw>(
      tableColumns,
      'contacts_raw',
      editMode.editState,
      {
        onStartEdit: editMode.startEdit,
        onCommitEdit: editMode.commitEdit,
        onCancelEdit: editMode.cancelEdit,
      },
      columnVisibility.columnVisibility
    );
  }, [tableColumns, editMode.editState, editMode.startEdit, editMode.commitEdit, editMode.cancelEdit, columnVisibility.columnVisibility]);
  
  // Create column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => {
    return tableColumns.map(col => ({
      key: col.name,
      label: col.displayName,
    }));
  }, [tableColumns]);
  
  // No need for fetchContacts anymore since we're using the hook

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact =>
      searchTerm === "" ||
      contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);

  const handleRowClick = (contact: ContactRaw) => {
    setSelectedContact(contact);
    setIsDrawerOpen(true);
  };

  // Handle multi-sort changes
  const handleSortChange = (newSortLevels: SortLevel[]) => {
    setSortLevels(newSortLevels);
    saveSortState('contacts_raw', newSortLevels);
  };

  // Clear sort
  const handleClearSort = () => {
    setSortLevels([]);
    clearSortState('contacts_raw');
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
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
        page: 'contacts',
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
            {filteredContacts.length} Contact{filteredContacts.length !== 1 ? 's' : ''}
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
            Add Contact
          </Button>
        </div>
      </div>

      {/* Dynamic Table */}
      <ResponsiveAdvancedTable
        data={filteredContacts}
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
          title: "No contacts found",
          description: "Try adjusting your search or filters to find contacts.",
        }}
        enableRowSelection={true}
        idKey="id"
        initialPageSize={50}
        tableId="contacts-table"
        tableType="contacts"
        hideColumnsButton={true}
      />

      {/* Drawers and Dialogs */}
      <ContactDrawer
        contact={selectedContact}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onContactUpdated={refetch}
      />

      <AddContactDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onContactAdded={() => {
          refetch();
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