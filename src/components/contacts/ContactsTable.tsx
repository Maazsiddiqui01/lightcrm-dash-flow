import { useState, useEffect, useMemo } from "react";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";
import { QuickAddContactNoteModal } from "./QuickAddContactNoteModal";
import { IntentionalNoOutreachModal } from "./IntentionalNoOutreachModal";
import { BulkImportModal } from "@/components/data-maintenance/BulkImportModal";
import { Button } from "@/components/ui/button";
import { Download, Plus, User, ArrowUpDown, MoreHorizontal, Edit, Eye, FileText, Mail, ChevronDown, UserX, RotateCcw, RefreshCw, Upload, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SplitButton } from "@/components/shared/SplitButton";
import { exportCsv } from "@/lib/export/exportService";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sendContactEmail } from "@/features/contacts/sendEmail";

// Dynamic column imports
import { CONTACTS_RAW_COLUMNS, getTableColumns } from "@/lib/supabase/getTableColumns";
import { createDynamicColumns } from "@/lib/dynamicColumns";
import { useEditMode } from "@/hooks/useEditMode";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ColumnsMenu } from "@/components/shared/ColumnsMenu";
import { EditToolbar } from "@/components/shared/EditToolbar";
import { useContactsWithOpportunities } from "@/hooks/useContactsWithOpportunities";
import { BulkGroupAssignmentModal } from "./BulkGroupAssignmentModal";
import { useFocusAreaSectorMapping } from "@/hooks/useFocusAreaSectorMapping";
import { mapFocusAreasToSectors, getAllFocusAreas } from "@/utils/sectorMapping";
import { calculateDaysOverUnderMaxLag } from "@/utils/contactCalculations";

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
  most_recent_group_contact: string | null;
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
  lg_lead: string | null;
  lg_assistant: string | null;
  group_contact: string | null;
  linkedin_url: string | null; // Added LinkedIn URL field
  intentional_no_outreach: boolean | null;
  intentional_no_outreach_date: string | null;
  intentional_no_outreach_note: string | null;
  opportunities: string; // Comma-separated deal names
  mapped_sectors?: string; // Computed field for sectors mapped from focus areas
  days_over_under_max_lag?: number | null; // Computed field for days over/under max lag
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
      ebitdaMin?: number;
      ebitdaMax?: number;
    };
  };
  onOpportunityColumnVisibilityChange?: (visible: boolean) => void;
}

export function ContactsTable({ filters: externalFilters = {}, onOpportunityColumnVisibilityChange }: ContactsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactRaw | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("most_recent_contact");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [noteContactId, setNoteContactId] = useState<string | null>(null);
  const [noteContactName, setNoteContactName] = useState<string>('');
  const [intentionalNoOutreachModal, setIntentionalNoOutreachModal] = useState<{
    open: boolean;
    contactId: string;
    contactName: string;
    isCurrentlySkipped: boolean;
  }>({ open: false, contactId: "", contactName: "", isCurrentlySkipped: false });
  const [showBulkGroupModal, setShowBulkGroupModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const { toast } = useToast();
  
  // Load sort state on mount
  useEffect(() => {
    const savedSort = loadSortState('contacts_raw');
    setSortLevels(savedSort);
  }, []);

  // Use the new hook to get contacts with opportunities
  const { contacts, loading, isRefreshing, refetch } = useContactsWithOpportunities(externalFilters);
  const { data: sectorMapping } = useFocusAreaSectorMapping();
  
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
  
  // Add computed sectors and days over/under max lag to contacts data
  const contactsWithComputedSectors = useMemo(() => {
    if (!sectorMapping) return contacts;
    
    return contacts.map(contact => ({
      ...contact,
      mapped_sectors: mapFocusAreasToSectors(
        getAllFocusAreas(contact),
        sectorMapping,
        contact.lg_sector
      ),
      days_over_under_max_lag: contact.intentional_no_outreach 
        ? null 
        : calculateDaysOverUnderMaxLag(contact.most_recent_contact, contact.delta)
    }));
  }, [contacts, sectorMapping]);

  // Get table columns metadata and add opportunities column
  const tableColumns = useMemo(() => {
    const baseColumns = getTableColumns('contacts_raw');
    const opportunitiesColumn = {
      name: 'opportunities',
      type: 'text',
      nullable: true,
      displayName: 'Opportunities'
    };
    // Insert opportunities column after "Profession" (category) and before "Preferred Contact Method" (contact_type)
    const professionIndex = baseColumns.findIndex(col => col.name === 'category');
    const insertIndex = professionIndex + 1;
    const newColumns = [...baseColumns];
    newColumns.splice(insertIndex, 0, opportunitiesColumn);
    return newColumns;
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

  // Handle send email
  const handleSendContactEmail = async (contactId: string) => {
    try {
      await sendContactEmail(contactId);
      toast({
        title: "Success",
        description: "Contact email sent successfully",
      });
    } catch (error) {
      console.error('Error sending contact email:', error);
      toast({
        title: "Error",
        description: "Failed to send contact email",
        variant: "destructive",
      });
    }
  };

  // Add actions column
  const columns = useMemo(() => {
    const actionsColumn = {
      key: "actions",
      label: "Actions",
      width: 120,
      enableHiding: false,
      render: (value: any, row: ContactRaw) => {
        const daysOverUnder = calculateDaysOverUnderMaxLag(row.most_recent_contact, row.delta);
        const isOverdue = daysOverUnder !== null && daysOverUnder < 0;
        const isCurrentlySkipped = row.intentional_no_outreach;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-8">
                <Mail className="mr-2 h-4 w-4" />
                Actions
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendContactEmail(row.id);
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Draft Email
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setNoteContactId(row.id);
                  setNoteContactName(row.full_name || row.email_address || 'Unknown');
                  setIsAddNoteModalOpen(true);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isCurrentlySkipped ? (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIntentionalNoOutreachModal({
                      open: true,
                      contactId: row.id,
                      contactName: row.full_name || 'Unknown',
                      isCurrentlySkipped: true
                    });
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Outreach
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIntentionalNoOutreachModal({
                      open: true,
                      contactId: row.id,
                      contactName: row.full_name || 'Unknown',
                      isCurrentlySkipped: false
                    });
                  }}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Skip Outreach
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    };

    return [actionsColumn, ...dynamicColumns];
  }, [dynamicColumns, toast]);
  
  // Create column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => {
    return tableColumns.map(col => ({
      key: col.name,
      label: col.displayName,
    }));
  }, [tableColumns]);
  
  // No need for fetchContacts anymore since we're using the hook

  const filteredContacts = useMemo(() => {
    const filtered = contactsWithComputedSectors.filter(contact =>
      searchTerm === "" ||
      contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.lg_sector?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.mapped_sectors?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply client-side sorting for proper numeric and date handling
    return applyClientSort(filtered, sortLevels);
  }, [contactsWithComputedSectors, searchTerm, sortLevels]);

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

  // Simplified export function - exports visible columns of filtered rows
  const handleExport = async () => {
    setIsExporting(true);
    
    // Get only visible columns
    const visibleColumns = dynamicColumns
      .filter(col => columnVisibility.columnVisibility[col.key] !== false)
      .map(col => col.key);
    
    const columnHeaders = Object.fromEntries(
      dynamicColumns.map(col => [col.key, col.label])
    );

    try {
      await exportCsv({
        page: 'contacts',
        mode: 'current', // Always export current view
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
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {filteredContacts.length} Contact{filteredContacts.length !== 1 ? 's' : ''}
            {isRefreshing && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                Updating...
              </div>
            )}
          </h3>
        </div>
        <div className="flex gap-2">
          {/* Selection Toolbar */}
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/20">
              <span className="text-sm font-medium text-foreground">
                {selectedRows.length} selected
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowBulkGroupModal(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Add to Group
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRows([])}
              >
                Clear
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
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
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>

          <SplitButton
            label="Add Contact"
            primaryAction={() => setIsAddDialogOpen(true)}
            menu={[
              { 
                label: 'Import CSV', 
                onClick: () => setIsImportModalOpen(true)
              }
            ]}
            icon={<Plus className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Dynamic Table */}
      <ResponsiveAdvancedTable
        data={filteredContacts}
        columns={columns}
        loading={loading} // Only show full skeleton on initial load
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={handleRowClick}
        editMode={editMode.editState.editMode} // Pass edit mode state
        emptyState={{
          title: isRefreshing ? "Updating contacts..." : "No contacts found",
          description: isRefreshing ? "Please wait while we update the contacts list." : "Try adjusting your search or filters to find contacts.",
        }}
        enableRowSelection={true}
        onSelectedRowsChange={setSelectedRows}
        idKey="id"
        initialPageSize={50}
        hideExportButton={true}
        tableId="contacts-table"
        tableType="contacts"
        hideColumnsButton={true}
        enableResizing={true}
        persistKey="contacts"
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

      {/* Add Note Modal */}
      <QuickAddContactNoteModal
        open={isAddNoteModalOpen}
        onOpenChange={setIsAddNoteModalOpen}
        contactId={noteContactId || ''}
        contactName={noteContactName}
      />

      {/* Intentional No Outreach Modal */}
      <IntentionalNoOutreachModal
        open={intentionalNoOutreachModal.open}
        onClose={() => setIntentionalNoOutreachModal(prev => ({ ...prev, open: false }))}
        contactId={intentionalNoOutreachModal.contactId}
        contactName={intentionalNoOutreachModal.contactName}
        isCurrentlySkipped={intentionalNoOutreachModal.isCurrentlySkipped}
        onSuccess={() => refetch()}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        entityType="contacts"
        onImportComplete={() => refetch()}
      />

      {/* Multi-Sort Dialog */}
      <MultiSortDialog
        open={isSortDialogOpen}
        onOpenChange={setIsSortDialogOpen}
        columns={columnOptions}
        sortLevels={sortLevels}
        onApply={handleSortChange}
      />

      {/* Bulk Group Assignment Modal */}
      <BulkGroupAssignmentModal
        open={showBulkGroupModal}
        onOpenChange={setShowBulkGroupModal}
        selectedContacts={selectedRows.map(contact => ({
          id: contact.id,
          full_name: contact.full_name || 'Unknown',
          group_contact: contact.group_contact
        }))}
        onSuccess={() => {
          refetch();
          setSelectedRows([]);
        }}
      />
    </div>
  );
}