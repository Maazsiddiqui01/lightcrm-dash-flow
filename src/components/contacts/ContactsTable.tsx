import { useState, useEffect, useMemo } from "react";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";
import { QuickAddContactNoteModal } from "./QuickAddContactNoteModal";
import { QuickAddContactNextStepModal } from "./QuickAddContactNextStepModal";
import { IntentionalNoOutreachModal } from "./IntentionalNoOutreachModal";
import { BulkImportModal } from "@/components/data-maintenance/BulkImportModal";
import { ContactMergeDialog } from "./ContactMergeDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, User, ArrowUpDown, MoreHorizontal, Edit, Eye, FileText, Mail, ChevronDown, UserX, RotateCcw, RefreshCw, Upload, Users, Database, Trash2, Loader2, CalendarIcon, Merge, Paperclip, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SplitButton } from "@/components/shared/SplitButton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useDeleteContact } from "@/hooks/useDeleteContact";
import { getAllRawColumns } from "@/lib/export/dataFetcher";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useContactDraftGenerator } from "@/hooks/useContactDraftGenerator";
import { supabase } from "@/integrations/supabase/client";
import type { ContactWithOpportunities, ContactFilters } from "@/types/contact";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useLastInteractionUpload } from "@/hooks/useLastInteractionUpload";
import { buildCsv, downloadCsv, generateExportFilename, safeCell } from "@/lib/export/csvUtils";
import { AttachmentUploadDialog } from "@/components/attachments/AttachmentUploadDialog";
import { FullHistoryDialog, TimelineItem } from "@/components/shared/FullHistoryDialog";
import { useContactNotes } from "@/hooks/useContactNotes";
import { useContactNextSteps } from "@/hooks/useContactNextSteps";

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
import { useDynamicEditOptions } from "@/hooks/useDynamicEditOptions";
import { 
  calculateDaysOverUnderMaxLag, 
  formatDaysOverUnder, 
  getDaysOverUnderColorClass, 
  calculateEffectiveOutreachData 
} from "@/utils/contactCalculations";

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

// Use consolidated type
type ContactRaw = ContactWithOpportunities;

interface ContactsTableProps {
  filters?: ContactFilters;
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
  const [isAddNextStepModalOpen, setIsAddNextStepModalOpen] = useState(false);
  const [nextStepContactId, setNextStepContactId] = useState<string | null>(null);
  const [nextStepContactName, setNextStepContactName] = useState<string>('');
  const [intentionalNoOutreachModal, setIntentionalNoOutreachModal] = useState<{
    open: boolean;
    contactId: string;
    contactName: string;
    isCurrentlySkipped: boolean;
  }>({ open: false, contactId: "", contactName: "", isCurrentlySkipped: false });
  const [showBulkGroupModal, setShowBulkGroupModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [isRefreshingInteractions, setIsRefreshingInteractions] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    contactIds: string[];
    contactNames: string[];
    isBulk: boolean;
  }>({ open: false, contactIds: [], contactNames: [], isBulk: false });
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachmentContact, setAttachmentContact] = useState<{ id: string; name: string } | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyContact, setHistoryContact] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();
  
  // Use unified draft generator
  const { generateDraft, isGenerating: isDraftGenerating } = useContactDraftGenerator();
  
  const { deleteContact, deleteBulk, isDeleting } = useDeleteContact({
    onSuccess: () => {
      setDeleteConfirmDialog({ open: false, contactIds: [], contactNames: [], isBulk: false });
      if (deleteConfirmDialog.isBulk) {
        setSelectedRows([]);
      }
      refetch();
    }
  });
  
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
  const dynamicEditOptions = useDynamicEditOptions();

  // Track opportunities column visibility and notify parent
  useEffect(() => {
    const isOpportunitiesVisible = columnVisibility.columnVisibility['opportunities'] !== false;
    onOpportunityColumnVisibilityChange?.(isOpportunitiesVisible);
  }, [columnVisibility.columnVisibility, onOpportunityColumnVisibilityChange]);
  
  // Add computed sectors and days over/under max lag to contacts data
  const contactsWithComputedSectors = useMemo(() => {
    if (!sectorMapping) return contacts;
    
    return contacts.map(contact => {
      // Calculate effective values using group logic if applicable
      const effective = calculateEffectiveOutreachData({
        group_contact: contact.group_contact,
        most_recent_contact: contact.most_recent_contact,
        most_recent_group_contact: contact.most_recent_group_contact,
        delta: contact.delta,
        group_delta: contact.group_delta
      });
      
      return {
        ...contact,
        mapped_sectors: mapFocusAreasToSectors(
          getAllFocusAreas(contact),
          sectorMapping,
          contact.lg_sector
        ),
        days_over_under_max_lag: contact.intentional_no_outreach 
          ? null 
          : calculateDaysOverUnderMaxLag(
              effective.effectiveMostRecentContact,
              effective.effectiveMaxLagDays
            )
      };
    });
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
      columnVisibility.columnVisibility,
      {
        sectors: dynamicEditOptions.sectors,
        focusAreas: dynamicEditOptions.focusAreas,
      }
    );
  }, [tableColumns, editMode.editState, editMode.startEdit, editMode.commitEdit, editMode.cancelEdit, columnVisibility.columnVisibility, dynamicEditOptions.sectors, dynamicEditOptions.focusAreas]);

  // Handle draft email generation
  const handleSendContactEmail = async (contactId: string) => {
    await generateDraft(contactId);
  };
  
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
  
  // Fetch email counts for all filtered contacts
  const { data: emailCounts = {} } = useQuery({
    queryKey: ['contact-email-counts', filteredContacts.map(c => c.id)],
    queryFn: async () => {
      const contactIds = filteredContacts.map(c => c.id);
      if (contactIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('contact_email_addresses')
        .select('contact_id')
        .in('contact_id', contactIds);
      
      if (error) throw error;
      
      // Count emails per contact
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        counts[row.contact_id] = (counts[row.contact_id] || 0) + 1;
      });
      
      return counts;
    },
    enabled: filteredContacts.length > 0,
  });
  
  // Add actions column and customize group_delta display and email_address column
  const columns = useMemo(() => {
    const actionsColumn = {
      key: "actions",
      label: "Actions",
      width: 120,
      enableHiding: false,
      render: (value: any, row: ContactRaw) => {
        // Use effective values for actions
        const effective = calculateEffectiveOutreachData({
          group_contact: row.group_contact,
          most_recent_contact: row.most_recent_contact,
          most_recent_group_contact: row.most_recent_group_contact,
          delta: row.delta,
          group_delta: row.group_delta
        });
        const daysOverUnder = calculateDaysOverUnderMaxLag(
          effective.effectiveMostRecentContact,
          effective.effectiveMaxLagDays
        );
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
                disabled={isDraftGenerating}
              >
                {isDraftGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Draft Email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachmentContact({ id: row.id, name: row.full_name || row.email_address || 'Unknown' });
                  setAttachmentDialogOpen(true);
                }}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Upload Document
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setHistoryContact({ id: row.id, name: row.full_name || row.email_address || 'Unknown' });
                  setHistoryDialogOpen(true);
                }}
              >
                <History className="mr-2 h-4 w-4" />
                View Full History
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
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setNextStepContactId(row.id);
                  setNextStepContactName(row.full_name || row.email_address || 'Unknown');
                  setIsAddNextStepModalOpen(true);
                }}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Add Next Step
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
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmDialog({
                    open: true,
                    contactIds: [row.id],
                    contactNames: [row.full_name || row.email_address || 'Unknown'],
                    isBulk: false
                  });
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    };

    // Customize columns
    const enhancedColumns = dynamicColumns.map(col => {
      // Customize email_address to show multiple email indicator
      if (col.key === 'email_address') {
        return {
          ...col,
          render: (value: any, row: ContactRaw) => {
            const emailCount = emailCounts[row.id] || 0;
            const hasMultiple = emailCount > 1;
            
            if (!value) return <span className="text-muted-foreground">—</span>;
            
            return (
              <div className="flex items-center gap-2">
                <a 
                  href={`mailto:${value}`}
                  className="truncate text-primary hover:underline cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {value}
                </a>
                {hasMultiple && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs">
                          +{emailCount - 1}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This contact has {emailCount} email addresses</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          }
        };
      }
      
      // Customize group_delta display
      if (col.key === 'group_delta') {
        return {
          ...col,
          label: 'Group Max Lag',
          render: (value: any, row: ContactRaw) => {
            const days = row.group_delta;
            if (!days) return <span className="text-muted-foreground">—</span>;
            return (
              <Badge 
                variant={days > 90 ? "destructive" : "secondary"}
                title="Group Max Lag is inherited from the group and can only be edited in Group Contacts view"
              >
                {days} days
              </Badge>
            );
          }
        };
      }
      
      return col;
    });

    return [actionsColumn, ...enhancedColumns];
  }, [dynamicColumns, toast, emailCounts]);

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

  // Refresh all contact interactions from database
  const handleRefreshInteractions = async () => {
    setIsRefreshingInteractions(true);
    try {
      const { data, error } = await supabase.rpc('refresh_all_contact_interactions');
      
      if (error) throw error;
      
      const updatedCount = data?.[0]?.contacts_updated || 0;
      
      toast({
        title: "Interactions Refreshed",
        description: `Successfully updated ${updatedCount} contact${updatedCount !== 1 ? 's' : ''} with latest interaction dates.`,
      });
      
      // Refetch contacts to show updated data
      await refetch();
    } catch (error) {
      console.error('Error refreshing interactions:', error);
      toast({
        title: "Error",
        description: "Failed to refresh interactions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshingInteractions(false);
    }
  };

  // Simplified export function - exports visible columns of filtered rows
  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Allowed DB columns only (exclude UI/computed like 'actions', 'opportunities', 'mapped_sectors', etc.)
      const allowed = new Set(getAllRawColumns('contacts'));
      const exportableColumns = dynamicColumns
        .filter(col => col.key !== 'actions' && allowed.has(col.key) && columnVisibility.columnVisibility[col.key] !== false);

      const visibleColumns = exportableColumns.map(col => col.key);
      const columnHeaders = Object.fromEntries(exportableColumns.map(col => [col.key, col.label]));

      // Determine rows: selected vs all filtered
      const selectedRowIds = selectedRows.map(row => row.id);
      const rowsToExport = selectedRowIds.length > 0
        ? selectedRows
        : filteredContacts;

      if (!rowsToExport || rowsToExport.length === 0) {
        toast({ title: 'No rows to export', description: 'Try adjusting your filters.', variant: 'destructive' });
        return;
      }

      // Build CSV
      const headers = visibleColumns.length > 0 ? visibleColumns.map(k => columnHeaders[k] || k) : [];
      const data = rowsToExport.map(row => {
        if (visibleColumns.length === 0) return [];
        return visibleColumns.map(col => safeCell((row as any)[col]));
      });

      const csv = buildCsv(headers, data);
      const filename = generateExportFilename(`contacts-current`);
      downloadCsv(filename, csv);

      toast({ title: 'Export complete', description: `Exported ${rowsToExport.length} row(s).` });
    } catch (err: any) {
      console.error('Contacts export failed, fallback error:', err);
      toast({ title: 'Export failed', description: err?.message || 'Unknown error', variant: 'destructive' });
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
            {loading && !isRefreshing && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs text-blue-700 dark:text-blue-300">
                <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                Loading...
              </div>
            )}
            {isRefreshing && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full text-xs text-amber-700 dark:text-amber-300">
                <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                Refreshing...
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
              {selectedRows.length >= 2 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsMergeDialogOpen(true)}
                >
                  <Merge className="h-4 w-4 mr-2" />
                  Merge Selected
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowBulkGroupModal(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Add to Group
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteConfirmDialog({
                    open: true,
                    contactIds: selectedRows.map(r => r.id),
                    contactNames: selectedRows.map(r => r.full_name || r.email_address || 'Unknown'),
                    isBulk: true
                  });
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={loading || isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isRefreshing) ? 'animate-spin' : ''}`} />
                Refresh View
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshInteractions}
                disabled={isRefreshingInteractions || loading}
                title="Recalculate all contact interaction dates from the database"
              >
                <Database className={`h-4 w-4 mr-2 ${isRefreshingInteractions ? 'animate-spin' : ''}`} />
                Sync Interactions
              </Button>
            </div>
            
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {(() => {
                const lastUpload = useLastInteractionUpload();
                const lastSyncTime = localStorage.getItem('lastInteractionSync');
                const lastSyncDate = lastSyncTime ? new Date(parseInt(lastSyncTime)) : null;
                
                return (
                  <>
                    {lastUpload.data && (
                      <span>
                        Last Data Upload: {lastUpload.data.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZoneName: 'short'
                        })}
                      </span>
                    )}
                    {lastSyncDate && (
                      <span>
                        Synced {formatDistanceToNow(lastSyncDate, { addSuffix: true })}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          
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
        enableColumnReordering={true}
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

      {/* Quick Add Next Step Modal */}
      <QuickAddContactNextStepModal
        open={isAddNextStepModalOpen}
        onOpenChange={setIsAddNextStepModalOpen}
        contactId={nextStepContactId || ''}
        contactName={nextStepContactName}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmDialog.open}
        onOpenChange={(open) => !isDeleting && setDeleteConfirmDialog({ ...deleteConfirmDialog, open })}
        onConfirm={() => {
          if (deleteConfirmDialog.isBulk) {
            deleteBulk(deleteConfirmDialog.contactIds);
          } else {
            deleteContact(deleteConfirmDialog.contactIds[0]);
          }
        }}
        title={deleteConfirmDialog.isBulk ? "Delete Contacts?" : "Delete Contact?"}
        description={
          deleteConfirmDialog.isBulk
            ? `Are you sure you want to delete ${deleteConfirmDialog.contactIds.length} contacts? This action cannot be undone.`
            : `Are you sure you want to delete ${deleteConfirmDialog.contactNames[0]}? This action cannot be undone.`
        }
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
      />

      {/* Contact Merge Dialog */}
      <ContactMergeDialog
        open={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        contacts={selectedRows}
        onSuccess={() => {
          refetch();
          setSelectedRows([]);
        }}
      />

      {/* Attachment Upload Dialog */}
      {attachmentContact && (
        <AttachmentUploadDialog
          open={attachmentDialogOpen}
          onOpenChange={setAttachmentDialogOpen}
          entityType="contact"
          entityId={attachmentContact.id}
          entityName={attachmentContact.name}
        />
      )}

      {/* Full History Dialog */}
      {historyContact && (
        <ContactFullHistoryWrapper
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          contactId={historyContact.id}
          contactName={historyContact.name}
        />
      )}
    </div>
  );
}

// Wrapper component to fetch contact history data
function ContactFullHistoryWrapper({
  open,
  onOpenChange,
  contactId,
  contactName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
}) {
  const { timeline: notesTimeline } = useContactNotes(contactId);
  const { timeline: nextStepsTimeline } = useContactNextSteps(contactId);

  const combinedTimeline: TimelineItem[] = useMemo(() => {
    const notes = (notesTimeline || []).map((item) => ({
      field: item.field,
      content: item.content,
      created_at: item.created_at,
      created_by: item.created_by,
    }));

    const nextSteps = (nextStepsTimeline || []).map((item) => ({
      field: item.field,
      content: item.content,
      created_at: item.created_at,
      created_by: item.created_by,
      due_date: item.due_date,
    }));

    return [...notes, ...nextSteps].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notesTimeline, nextStepsTimeline]);

  return (
    <FullHistoryDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`History for ${contactName}`}
      description="View all notes and next steps for this contact"
      timeline={combinedTimeline}
      fieldLabels={{
        notes: "Notes",
        next_steps: "Next Steps",
        most_recent_notes: "Most Recent Notes",
      }}
    />
  );
}