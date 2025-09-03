import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/shared/DataTable";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";
import { FilterModal, ActiveFilters } from "@/components/shared/FilterModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, Plus, User, Download, Search, X } from "lucide-react";
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

  const handleApplyFilters = () => {
    // Filters are already applied through useEffect dependency on filters
  };

  const handleRemoveFilter = (key: string, value?: string) => {
    removeFilter(key, value);
  };

  const exportToCSV = () => {
    const csvData = filteredContacts.map(contact => ({
      Name: contact.full_name || '',
      Email: contact.email_address || '',
      Organization: contact.organization || '',
      Title: contact.title || '',
      'Focus Areas': contact.lg_focus_areas_comprehensive_list || '',
      'Areas of Specialization': contact.areas_of_specialization || '',
      Emails: contact.of_emails || 0,
      Meetings: contact.of_meetings || 0,
      Opportunities: contact.all_opps || 0,
      'Last Touch': contact.most_recent_contact || ''
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Transform data for DataTable - preserve original structure
  const tableData = filteredContacts.map(contact => ({
    ...contact,
    // Add formatted display versions while keeping originals
    full_name_display: contact.full_name || "Unnamed Contact",
    email_display: contact.email_address || "—",
    organization_display: contact.organization || "—", 
    title_display: contact.title || "—",
    focus_areas_display: contact.lg_focus_areas_comprehensive_list || "—",
    emails_display: contact.of_emails || 0,
    meetings_display: contact.of_meetings || 0,
    opportunities_display: contact.all_opps || 0,
    last_touch_display: contact.most_recent_contact 
      ? new Date(contact.most_recent_contact).toLocaleDateString()
      : "—"
  }));

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

        {/* Search and Export */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="outline" onClick={exportToCSV} className="ml-4">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* DataTable */}
        <div className="bg-card rounded-lg shadow-md border border-border overflow-hidden">
          <DataTable
            rows={loading ? undefined : tableData}
            preferredOrder={[
              "full_name", "email_address", "organization", "title", 
              "lg_focus_areas_comprehensive_list", "of_emails", "of_meetings", 
              "all_opps", "most_recent_contact"
            ]}
            initialWidths={{
              full_name: 200,
              email_address: 250,
              organization: 200,
              title: 180,
              lg_focus_areas_comprehensive_list: 250,
              of_emails: 100,
              of_meetings: 100,
              all_opps: 120,
              most_recent_contact: 150
            }}
            persistKey="contacts"
            onRowClick={(row) => handleRowClick(row as any)}
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