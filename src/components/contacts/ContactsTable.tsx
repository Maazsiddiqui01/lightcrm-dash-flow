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
}

export function ContactsTable() {
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
  
  // Advanced filters
  const { filters, updateFilters, clearFilters, removeFilter } = useUrlFilters({
    organizations: [],
    focusAreas: [],
    specializations: []
  });
  
  // Fetch distinct values for filters
  const { values: organizationOptions } = useDistinctValues({
    table: 'contacts_app',
    column: 'organization',
    searchTerm: ''
  });
  
  const { values: focusAreaOptions } = useDistinctValues({
    table: 'contacts_app',
    column: 'lg_focus_areas_comprehensive_list',
    searchTerm: '',
    isTextArray: true
  });
  
  const { values: specializationOptions } = useDistinctValues({
    table: 'contacts_app',
    column: 'areas_of_specialization',
    searchTerm: '',
    isTextArray: true
  });

  useEffect(() => {
    fetchContacts();
  }, [sortKey, sortDirection, filters]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("contacts_app")
        .select("*");

      // Apply filters
      const orgs = filters.organizations as string[] || [];
      const focusAreas = filters.focusAreas as string[] || [];
      const specializations = filters.specializations as string[] || [];
      
      if (orgs.length > 0) {
        query = query.in('organization', orgs);
      }
      
      if (focusAreas.length > 0) {
        const focusQuery = focusAreas.map(fa => `lg_focus_areas_comprehensive_list.ilike.%${fa}%`).join(',');
        query = query.or(focusQuery);
      }
      
      if (specializations.length > 0) {
        const specQuery = specializations.map(spec => `areas_of_specialization.ilike.%${spec}%`).join(',');
        query = query.or(specQuery);
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

  // Create filter field definitions
  const filterFields = [
    {
      key: 'organizations',
      label: 'Organizations',
      type: 'multi-select' as const,
      options: organizationOptions,
      searchable: true,
      placeholder: 'Select organizations...'
    },
    {
      key: 'focusAreas', 
      label: 'Focus Areas',
      type: 'multi-select' as const,
      options: focusAreaOptions,
      searchable: true,
      placeholder: 'Select focus areas...'
    },
    {
      key: 'specializations',
      label: 'Areas of Specialization', 
      type: 'multi-select' as const,
      options: specializationOptions,
      searchable: true,
      placeholder: 'Select specializations...'
    }
  ];
  
  // Create active filter chips
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string }> = [];
    
    const orgs = filters.organizations as string[] || [];
    orgs.forEach(org => chips.push({ key: 'organizations', label: 'Organization', value: org }));
    
    const focusAreas = filters.focusAreas as string[] || [];
    focusAreas.forEach(fa => chips.push({ key: 'focusAreas', label: 'Focus Area', value: fa }));
    
    const specializations = filters.specializations as string[] || [];
    specializations.forEach(spec => chips.push({ key: 'specializations', label: 'Specialization', value: spec }));
    
    return chips;
  }, [filters]);

  const activeFilterCount = activeFilterChips.length;

  const handleRowClick = (contact: ContactApp) => {
    setSelectedContact(contact);
    setIsDrawerOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleApplyFilters = () => {
    // Filters are already applied through useEffect dependency on filters
  };

  const handleRemoveFilter = (key: string, value?: string) => {
    removeFilter(key, value);
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
  const exportSummaryCsv = () => {
    if (!filteredContacts.length) {
      toast({
        title: "No data to export",
        description: "No contacts match your current filters.",
        variant: "destructive"
      });
      return;
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `contacts-summary-${currentDate}.csv`;
    
    // Get visible column data
    const exportData = filteredContacts.map(contact => {
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
      description: `Exported ${filteredContacts.length} contacts`
    });
  };

  const exportDetailedCsv = async () => {
    if (!filteredContacts.length) {
      toast({
        title: "No data to export",
        description: "No contacts match your current filters.",
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
      const contactIds = filteredContacts.map(c => c.id);
      console.log('Exporting contact IDs:', contactIds);
      
      // Fetch comprehensive contact data
      const { data: detailedContacts, error: contactsError } = await supabase
        .from('contacts_app')
        .select(`
          id, full_name, email_address, organization, title,
          areas_of_specialization, lg_focus_areas_comprehensive_list,
          lg_focus_area_1, lg_focus_area_2, lg_focus_area_3, lg_focus_area_4,
          lg_focus_area_5, lg_focus_area_6, lg_focus_area_7, lg_focus_area_8,
          lg_sector, delta_type, delta, of_emails, of_meetings, 
          most_recent_contact, notes
        `)
        .in('id', contactIds);

      if (contactsError) {
        console.error('Contacts query error:', contactsError);
        throw contactsError;
      }
      
      console.log('Fetched contacts:', detailedContacts?.length);

      // Fetch recent interactions for each contact
      const emailList = detailedContacts?.map(c => c.email_address?.toLowerCase()).filter(Boolean) || [];
      console.log('Email list for interactions:', emailList.length);
      let interactions: any[] = [];
      
      if (emailList.length > 0) {
        const { data: interactionData, error: interactionsError } = await supabase
          .from('interactions_flat')
          .select('email, occurred_at, subject')
          .in('email', emailList);
        
        if (interactionsError) {
          console.error('Interactions query error:', interactionsError);
          throw interactionsError;
        }
        interactions = interactionData || [];
        console.log('Fetched interactions:', interactions.length);
      }

      // Fetch opportunities for each contact
      const { data: opportunities, error: oppsError } = await supabase
        .from('opportunities_raw')
        .select('deal_name, deal_source_individual_1, deal_source_individual_2')
        .limit(1000);

      if (oppsError) {
        console.error('Opportunities query error:', oppsError);
        throw oppsError;
      }
      
      console.log('Fetched opportunities:', opportunities?.length);

      // Process and join data
      const exportData = detailedContacts?.map(contact => {
        // Find most recent interaction
        const contactInteractions = interactions?.filter(i => 
          i.email?.toLowerCase() === contact.email_address?.toLowerCase()
        ) || [];
        const mostRecentInteraction = contactInteractions.sort((a, b) => 
          new Date(b.occurred_at || 0).getTime() - new Date(a.occurred_at || 0).getTime()
        )[0];

        // Find opportunities where this contact is a deal source
        const normalizeContactName = (contact.full_name || '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();
        
        const contactOpps = opportunities?.filter(opp => {
          const name1 = (opp.deal_source_individual_1 || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
          const name2 = (opp.deal_source_individual_2 || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
          return name1 === normalizeContactName || name2 === normalizeContactName;
        }) || [];

        // Dedupe opportunities by deal_name
        const uniqueOpps = Array.from(
          new Map(contactOpps.map(opp => [opp.deal_name?.toLowerCase(), opp.deal_name]))
          .values()
        ).filter(Boolean);

        return {
          'Full Name': contact.full_name || '',
          'Email': contact.email_address || '',
          'Organization': contact.organization || '',
          'Title': contact.title || '',
          'Areas of Specialization': contact.areas_of_specialization || '',
          'LG Focus Areas (Comprehensive)': contact.lg_focus_areas_comprehensive_list || '',
          'LG Focus Area 1': contact.lg_focus_area_1 || '',
          'LG Focus Area 2': contact.lg_focus_area_2 || '',
          'LG Focus Area 3': contact.lg_focus_area_3 || '',
          'LG Focus Area 4': contact.lg_focus_area_4 || '',
          'LG Focus Area 5': contact.lg_focus_area_5 || '',
          'LG Focus Area 6': contact.lg_focus_area_6 || '',
          'LG Focus Area 7': contact.lg_focus_area_7 || '',
          'LG Focus Area 8': contact.lg_focus_area_8 || '',
          'LG Sector': contact.lg_sector || '',
          'Delta Type': contact.delta_type || '',
          'Delta': contact.delta || '',
          'Emails': contact.of_emails || '',
          'Meetings': contact.of_meetings || '',
          'Most Recent Contact': contact.most_recent_contact ? 
            new Date(contact.most_recent_contact).toISOString().split('T')[0] : '',
          'Next Scheduled Outreach Date': '',
          'Recent Interaction At': mostRecentInteraction?.occurred_at ? 
            new Date(mostRecentInteraction.occurred_at).toISOString() : '',
          'Recent Interaction Subject': mostRecentInteraction?.subject || '',
          'Opportunities (as Deal Source)': uniqueOpps.join(', '),
          'Notes': contact.notes || ''
        };
      }) || [];

      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `contacts-detailed-${currentDate}.csv`;
      const csvContent = jsonToCsv(exportData);
      downloadFile(csvContent, filename, 'text/csv');

      toast({
        title: "Export completed",
        description: `Exported ${exportData.length} contacts with detailed information`
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export detailed CSV. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const emptyState = {
    title: "No contacts found",
    description: searchTerm || activeFilterCount > 0 
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
          <FilterModal
            title="Contact Filters"
            fields={filterFields}
            values={filters}
            onValuesChange={updateFilters}
            onApply={handleApplyFilters}
            onClearAll={clearFilters}
            activeFilterCount={activeFilterCount}
          >
            <Button variant="outline" className="focus-ring">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </FilterModal>
          {/* Split Export Button */}
          <div className="flex">
            <Button 
              variant="outline" 
              onClick={exportSummaryCsv}
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
                  onClick={exportSummaryCsv}
                  disabled={isExporting}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Summary CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={exportDetailedCsv}
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