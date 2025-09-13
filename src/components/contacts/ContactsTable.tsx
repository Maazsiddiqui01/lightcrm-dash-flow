import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";
import { Button } from "@/components/ui/button";
import { Download, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { jsonToCsv, downloadFile } from "@/utils/csvExport";

// Dynamic column imports
import { CONTACTS_RAW_COLUMNS, getTableColumns } from "@/lib/supabase/getTableColumns";
import { createDynamicColumns } from "@/lib/dynamicColumns";
import { useEditMode } from "@/hooks/useEditMode";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { ColumnsMenu } from "@/components/shared/ColumnsMenu";
import { EditToolbar } from "@/components/shared/EditToolbar";

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
  created_at: string | null;
  updated_at: string | null;
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
  };
}

export function ContactsTable({ filters: externalFilters = {} }: ContactsTableProps) {
  const [contacts, setContacts] = useState<ContactRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactRaw | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("most_recent_contact");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  // Initialize edit mode and column visibility
  const editMode = useEditMode('contacts_raw', contacts, setContacts);
  const columnVisibility = useColumnVisibility('columns:contacts_raw');
  
  // Get table columns metadata
  const tableColumns = useMemo(() => getTableColumns('contacts_raw'), []);
  
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
  
  useEffect(() => {
    fetchContacts();
  }, [sortKey, sortDirection, externalFilters]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("contacts_raw")
        .select("*");

      // Apply external filters
      const {
        focusAreas = [],
        sectors = [],
        areasOfSpecialization = [],
        organizations = [],
        titles = [],
        categories = [],
        deltaType = [],
        hasOpportunities = [],
        mostRecentContactStart,
        mostRecentContactEnd,
        deltaMin,
        deltaMax
      } = externalFilters;

      // Focus Areas - partial match in comma-separated list
      if (focusAreas.length > 0) {
        const focusQuery = focusAreas.map(fa => `lg_focus_areas_comprehensive_list.ilike.%${fa}%`).join(',');
        query = query.or(focusQuery);
      }

      // Sectors
      if (sectors.length > 0) {
        query = query.in('lg_sector', sectors);
      }

      // Areas of specialization
      if (areasOfSpecialization.length > 0) {
        const areasQuery = areasOfSpecialization.map(area => `areas_of_specialization.ilike.%${area}%`).join(',');
        query = query.or(areasQuery);
      }

      // Organizations
      if (organizations.length > 0) {
        query = query.in('organization', organizations);
      }

      // Titles
      if (titles.length > 0) {
        query = query.in('title', titles);
      }

      // Categories
      if (categories.length > 0) {
        query = query.in('category', categories);
      }

      // Delta Type
      if (deltaType.length > 0) {
        query = query.in('delta_type', deltaType);
      }

      // Has Opportunities
      if (hasOpportunities.length > 0) {
        if (hasOpportunities.includes('Yes')) {
          query = query.gt('all_opps', 0);
        }
        if (hasOpportunities.includes('No')) {
          query = query.or('all_opps.is.null,all_opps.eq.0');
        }
      }

      // Date range for most recent contact
      if (mostRecentContactStart) {
        query = query.gte('most_recent_contact', mostRecentContactStart);
      }
      if (mostRecentContactEnd) {
        query = query.lte('most_recent_contact', mostRecentContactEnd);
      }

      // Delta range
      if (deltaMin !== null && deltaMin !== undefined) {
        query = query.gte('delta', deltaMin);
      }
      if (deltaMax !== null && deltaMax !== undefined) {
        query = query.lte('delta', deltaMax);
      }

      // Apply sorting
      if (sortKey && sortDirection) {
        query = query.order(sortKey, { ascending: sortDirection === 'asc', nullsFirst: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching contacts:", error);
        toast({
          title: "Error",
          description: "Failed to fetch contacts. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setContacts(data || []);
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

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  // Export functions
  const exportSummaryCsv = async () => {
    setIsExporting(true);
    try {
      const exportData = filteredContacts.map(contact => ({
        'Full Name': contact.full_name || '',
        'Email': contact.email_address || '',
        'Organization': contact.organization || '',
        'Title': contact.title || '',
        'LG Sector': contact.lg_sector || '',
        'Focus Areas': contact.lg_focus_areas_comprehensive_list || '',
        'Areas of Specialization': contact.areas_of_specialization || '',
        'Category': contact.category || '',
        'Most Recent Contact': contact.most_recent_contact || '',
        'Total Contacts': contact.total_of_contacts || 0,
        'Emails': contact.of_emails || 0,
        'Meetings': contact.of_meetings || 0,
        'All Opportunities': contact.all_opps || 0,
        'Delta': contact.delta || 0,
        'Delta Type': contact.delta_type || '',
      }));

      const csv = jsonToCsv(exportData);
      downloadFile(csv, `contacts-summary-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} contacts to CSV.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailedCsv = async () => {
    setIsExporting(true);
    try {
      // Export all columns from contacts_raw
      const csv = jsonToCsv(filteredContacts);
      downloadFile(csv, `contacts-detailed-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      
      toast({
        title: "Export Successful",
        description: `Exported ${filteredContacts.length} contacts with all details to CSV.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export detailed contacts. Please try again.",
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
            onShowAll={columnVisibility.showAllColumns}
            onHideAll={columnVisibility.hideAllColumns}
          />
          
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
        emptyState={{
          title: "No contacts found",
          description: "Try adjusting your search or filters to find contacts.",
        }}
        enableRowSelection={true}
        idKey="id"
        initialPageSize={25}
        tableId="contacts-table"
        tableType="contacts"
        hideColumnsButton={true}
      />

      {/* Drawers and Dialogs */}
      <ContactDrawer
        contact={selectedContact}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onContactUpdated={fetchContacts}
      />

      <AddContactDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onContactAdded={() => {
          fetchContacts();
          setIsAddDialogOpen(false);
        }}
      />
    </div>
  );
}