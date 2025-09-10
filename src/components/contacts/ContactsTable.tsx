import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedTable, ColumnDef, TablePreset } from "@/components/shared/AdvancedTable";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";
import { FilterModal, ActiveFilters } from "@/components/shared/FilterModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, Plus, User, Download, FileText, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useDistinctValues } from "@/hooks/useDistinctValues";
import { jsonToCsv, downloadFile } from "@/utils/csvExport";
import { exportContactsDetailedCSV } from "@/utils/exportDetailedCsv";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface ContactApp {
  id: string;
  full_name: string | null;
  email_address: string | null;
  organization: string | null;
  title: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  areas_of_specialization: string | null;
  of_emails: number | null;
  of_meetings: number | null;
  all_opps: number | null;
  most_recent_contact: string | null;
  lg_sector: string | null;
  category: string | null;
  delta_type: string | null;
  delta: number | null;
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
  const [contacts, setContacts] = useState<ContactApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactApp | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("most_recent_contact");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
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

      // Areas of Specialization - partial match
      if (areasOfSpecialization.length > 0) {
        const specQuery = areasOfSpecialization.map(spec => `areas_of_specialization.ilike.%${spec}%`).join(',');
        query = query.or(specQuery);
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

      // Delta Type (Outreach Cadence)
      if (deltaType.length > 0) {
        query = query.in('delta_type', deltaType);
      }

      // Has Opportunities
      if (hasOpportunities.length > 0) {
        if (hasOpportunities.includes('Yes')) {
          query = query.gt('all_opps', 0);
        }
        if (hasOpportunities.includes('No') && !hasOpportunities.includes('Yes')) {
          query = query.eq('all_opps', 0);
        }
      }

      // Most Recent Contact Date Range
      if (mostRecentContactStart) {
        query = query.gte('most_recent_contact', mostRecentContactStart);
      }
      if (mostRecentContactEnd) {
        query = query.lte('most_recent_contact', mostRecentContactEnd);
      }

      // Delta Days Range
      if (deltaMin !== null && deltaMin !== undefined) {
        query = query.gte('delta', deltaMin);
      }
      if (deltaMax !== null && deltaMax !== undefined) {
        query = query.lte('delta', deltaMax);
      }

      if (sortKey && sortDirection) {
        query = query.order(sortKey, { 
          ascending: sortDirection === 'asc',
          nullsFirst: false 
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      setContacts((data as any) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchContacts();
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email_address?.toLowerCase().includes(searchTerm.toLowerCase());

      return searchMatch;
    });
  }, [contacts, searchTerm]);

  // Calculate active filter count from external filters
  const activeFilterCount = useMemo(() => {
    return Object.values(externalFilters).reduce((count: number, value) => {
      if (Array.isArray(value)) {
        return count + value.length;
      }
      if (value !== null && value !== undefined && value !== '') {
        return count + 1;
      }
      return count;
    }, 0);
  }, [externalFilters]);

  // Remove unused filter-related functions since we're using external filters
  const handleRemoveFilter = () => {
    // Placeholder - not needed with external filters
  };

  const clearFilters = () => {
    // Placeholder - not needed with external filters
  };

  // Create placeholder for activeFilterChips since filters are managed externally
  const activeFilterChips: any[] = [];

  const handleRowClick = (contact: ContactApp) => {
    setSelectedContact(contact);
    setIsDrawerOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleApplyFilters = () => {
    // Filters are already applied through useEffect dependency on externalFilters
  };

  // Column definitions
  const columns: ColumnDef<ContactApp>[] = [
    {
      key: "full_name",
      label: "Full Name",
      sticky: true,
      width: 200,
      minWidth: 150,
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{value || "Unnamed Contact"}</span>
        </div>
      )
    },
    {
      key: "email_address",
      label: "Email",
      width: 250,
      minWidth: 200,
      sortable: true,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block text-muted-foreground">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{value || "No email address"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      key: "organization",
      label: "Organization",
      width: 200,
      minWidth: 150,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "title",
      label: "Title",
      width: 180,
      minWidth: 120,
      sortable: true,
      render: (value) => value || "—"
    },
    {
      key: "lg_focus_areas_comprehensive_list",
      label: "Focus Areas",
      width: 250,
      minWidth: 200,
      render: (value) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block">{value || "—"}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{value || "No focus areas listed"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      key: "of_emails",
      label: "Emails",
      width: 100,
      minWidth: 80,
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
          {value || 0}
        </Badge>
      )
    },
    {
      key: "of_meetings",
      label: "Meetings",
      width: 100,
      minWidth: 80,
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
          {value || 0}
        </Badge>
      )
    },
    {
      key: "all_opps",
      label: "Opportunities",
      width: 120,
      minWidth: 100,
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
          {value || 0}
        </Badge>
      )
    },
    {
      key: "most_recent_contact",
      label: "Last Touch",
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value) => {
        if (!value) return "—";
        const date = new Date(value);
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground">
                  {date.toLocaleDateString()}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{date.toLocaleString()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    }
  ];

  // Table presets
  const presets: TablePreset[] = [
    {
      name: "Compact",
      columns: ["full_name", "email_address", "organization", "of_emails", "of_meetings"]
    },
    {
      name: "Standard", 
      columns: ["full_name", "email_address", "organization", "title", "of_emails", "of_meetings", "most_recent_contact"]
    },
    {
      name: "Wide",
      columns: ["full_name", "email_address", "organization", "title", "lg_focus_areas_comprehensive_list", "of_emails", "of_meetings", "all_opps", "most_recent_contact"]
    }
  ];

  // Export functionality  
  const exportSummaryCsv = (selectedRows?: ContactApp[]) => {
    const dataToExport = selectedRows && selectedRows.length > 0 ? selectedRows : filteredContacts;
    
    if (!dataToExport.length) {
      toast({
        title: "No data to export",
        description: selectedRows ? "No rows selected" : "No contacts match your current filters.",
        variant: "destructive"
      });
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `contacts-summary-${currentDate}.csv`;
    
    // Get visible column data
    const exportData = dataToExport.map(contact => {
      const row: Record<string, any> = {};
      columns.forEach(col => {
        const value = contact[col.key as keyof ContactApp];
        row[col.label] = value ?? '';
      });
      return row;
    });

    const csvContent = jsonToCsv(exportData);
    downloadFile(csvContent, filename, 'text/csv');
    
    toast({
      title: "Export completed",
      description: selectedRows 
        ? `Exported ${selectedRows.length} selected contacts`
        : `Exported ${filteredContacts.length} contacts`
    });
  };

  const exportDetailedCsv = async (selectedRows?: ContactApp[]) => {
    const dataToExport = selectedRows && selectedRows.length > 0 ? selectedRows : filteredContacts;
    
    if (!dataToExport.length) {
      toast({
        title: "No data to export",
        description: selectedRows ? "No rows selected" : "No contacts match your current filters.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    toast({
      title: "Preparing Detailed CSV...",
      description: "This may take a moment"
    });

    try {
      const exportIds = dataToExport.map(c => c.id);
      await exportContactsDetailedCSV(exportIds);
      
      toast({
        title: "Export completed",
        description: selectedRows 
          ? `Exported ${selectedRows.length} selected contacts with detailed information`
          : `Exported ${filteredContacts.length} contacts with detailed information`
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error?.message || "Failed to export detailed CSV. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectedRowsExport = (selectedRows: ContactApp[]) => {
    if (selectedRows.length === 0) {
      toast({
        title: "No rows selected",
        description: "Exporting all filtered contacts instead.",
      });
      exportSummaryCsv();
    } else {
      exportSummaryCsv(selectedRows);
    }
  };

  const emptyState = {
    title: "No contacts found",
    description: searchTerm || (typeof activeFilterCount === 'number' && activeFilterCount > 0) 
      ? "Try adjusting your search or filters to find contacts."
      : "Start building your professional network by adding your first contact.",
    action: (
      <Button onClick={() => setIsAddDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Contact
      </Button>
    )
  };

  return (
    <div className="bg-background">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">All Contacts</h3>
            <p className="text-sm text-muted-foreground">
              {filteredContacts?.length || 0} contact{filteredContacts?.length !== 1 ? 's' : ''} total
            </p>
          </div>
        <div className="flex items-center space-x-2">
          {/* Split Export Button */}
          <div className="flex">
            <Button 
              variant="outline" 
              onClick={() => exportSummaryCsv()}
              disabled={isExporting}
              className="rounded-r-none border-r-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isExporting}
                  className="rounded-l-none border-l border-border/50 px-2"
                >
                  <svg
                    width="4"
                    height="4"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                  >
                    <path
                      d="m4.93179 5.43179c-.20264-.20264-.20264-.53117 0-.73381.20267-.20267.53116-.20267.73383 0l2.33388 2.33398 2.3338-2.33398c.2027-.20267.5312-.20267.7338 0 .2027.20264.2027.53117 0 .73381l-2.6657 2.6657c-.2026.2027-.5311.2027-.7338 0z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => exportSummaryCsv()}
                  disabled={isExporting}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Summary CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportDetailedCsv()}
                  disabled={isExporting}
                >
                  <List className="h-4 w-4 mr-2" />
                  Detailed CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterChips.length > 0 && (
          <div className="bg-muted rounded-lg p-4 border border-border">
            <ActiveFilters
              filters={activeFilterChips}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={clearFilters}
            />
          </div>
        )}

        {/* Table Container */}
        <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
          <AdvancedTable
        data={filteredContacts}
        columns={columns}
        loading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        onRowClick={handleRowClick}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDirection}
        emptyState={emptyState}
        tableId="contacts"
        presets={presets}
        exportFilename="contacts"
        hideExportButton={true}
        enableRowSelection={true}
        selectedRowExportFn={handleSelectedRowsExport}
        idKey="id"
          />
      </div>
      </div>

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
          setIsAddDialogOpen(false);
          refetch();
        }} 
      />
    </div>
  );
}