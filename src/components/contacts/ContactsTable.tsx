import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedTable, ColumnDef, TablePreset } from "@/components/shared/AdvancedTable";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Filter, Plus, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ContactApp {
  id: string;
  full_name: string | null;
  email_address: string | null;
  organization: string | null;
  title: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  of_emails: number | null;
  of_meetings: number | null;
  total_of_contacts: number | null;
  most_recent_contact: string | null;
}

export function ContactsTable() {
  const [contacts, setContacts] = useState<ContactApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [touchedInDays, setTouchedInDays] = useState("all");
  const [selectedContact, setSelectedContact] = useState<ContactApp | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string>("most_recent_contact");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, [sortKey, sortDirection]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("contacts_app")
        .select("*");

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

  const isWithinDays = (dateString: string | null, days: number) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Search filter
      const searchMatch = searchTerm === "" || 
        contact.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email_address?.toLowerCase().includes(searchTerm.toLowerCase());

      // Organization filter
      const orgMatch = selectedOrganizations.length === 0 || 
        (contact.organization && selectedOrganizations.includes(contact.organization));

      // Touch filter
      let touchMatch = true;
      if (touchedInDays !== "all") {
        const days = parseInt(touchedInDays);
        touchMatch = isWithinDays(contact.most_recent_contact, days);
      }

      return searchMatch && orgMatch && touchMatch;
    });
  }, [contacts, searchTerm, selectedOrganizations, touchedInDays]);

  const uniqueOrganizations = useMemo(() => {
    return Array.from(new Set(
      contacts
        .map(contact => contact.organization)
        .filter(Boolean)
    )).sort();
  }, [contacts]);

  const toggleOrganization = (org: string) => {
    setSelectedOrganizations(prev => 
      prev.includes(org) 
        ? prev.filter(o => o !== org)
        : [...prev, org]
    );
  };

  const handleRowClick = (contact: ContactApp) => {
    setSelectedContact(contact);
    setIsDrawerOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key);
    setSortDirection(direction);
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
      key: "total_of_contacts",
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
      columns: ["full_name", "email_address", "organization", "title", "lg_focus_areas_comprehensive_list", "of_emails", "of_meetings", "total_of_contacts", "most_recent_contact"]
    }
  ];

  // Active filters for display
  const activeFilters = useMemo(() => {
    const filters: { label: string; onRemove: () => void }[] = [];
    
    selectedOrganizations.forEach(org => {
      filters.push({
        label: `Org: ${org}`,
        onRemove: () => toggleOrganization(org)
      });
    });

    if (touchedInDays !== "all") {
      filters.push({
        label: `Touched in ${touchedInDays} days`,
        onRemove: () => setTouchedInDays("all")
      });
    }

    return filters;
  }, [selectedOrganizations, touchedInDays]);

  const clearAllFilters = () => {
    setSelectedOrganizations([]);
    setTouchedInDays("all");
    setSearchTerm("");
  };

  // Filters component
  const filtersComponent = (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="focus-ring">
            <Filter className="h-4 w-4 mr-2" />
            Organizations
            {selectedOrganizations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedOrganizations.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-medium">Filter by Organization</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {uniqueOrganizations.map((org) => (
                <div key={org} className="flex items-center space-x-2">
                  <Checkbox
                    id={org}
                    checked={selectedOrganizations.includes(org)}
                    onCheckedChange={() => toggleOrganization(org)}
                  />
                  <label htmlFor={org} className="text-sm">{org}</label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Select value={touchedInDays} onValueChange={setTouchedInDays}>
        <SelectTrigger className="w-48 focus-ring">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Contacts</SelectItem>
          <SelectItem value="7">Touched in 7 days</SelectItem>
          <SelectItem value="30">Touched in 30 days</SelectItem>
          <SelectItem value="90">Touched in 90 days</SelectItem>
          <SelectItem value="365">Touched in 1 year</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const emptyState = {
    title: "No contacts found",
    description: searchTerm || activeFilters.length > 0 
      ? "Try adjusting your search or filters to find contacts."
      : "Start building your professional network by adding your first contact.",
    action: <AddContactDialog open={false} onClose={() => {}} onContactAdded={refetch} />
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-section-title">All Contacts</h3>
          <p className="text-meta mt-1">
            {filteredContacts?.length || 0} contact{filteredContacts?.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>

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
        filters={filtersComponent}
        activeFilters={activeFilters}
        onClearAllFilters={clearAllFilters}
        emptyState={emptyState}
        tableId="contacts"
        presets={presets}
        exportFilename="contacts"
      />

      <ContactDrawer
        contact={selectedContact}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onContactUpdated={refetch}
      />
    </div>
  );
}