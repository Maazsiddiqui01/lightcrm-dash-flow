import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedTable, ColumnDef, TablePreset } from "@/components/shared/AdvancedTable";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";
import { FilterModal, ActiveFilters } from "@/components/shared/FilterModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { useDistinctValues } from "@/hooks/useDistinctValues";

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