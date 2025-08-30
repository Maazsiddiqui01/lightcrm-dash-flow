import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ContactDrawer } from "./ContactDrawer";
import { AddContactDialog } from "./AddContactDialog";

interface Contact {
  id: string;
  full_name: string;
  title: string;
  email: string;
  organization: string;
  opportunities_count: number;
  meetings_count: number;
  emails_count: number;
  last_touch: string;
  focus_areas: string;
  notes: string;
  created_at: string;
  updated_at: string;
  no_of_lg_focus_areas: number;
}

export function ContactsTable() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([]);
  const [touchedInDays, setTouchedInDays] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;
  const { toast } = useToast();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contacts_app")
        .select("*")
        .order("last_touch", { ascending: false });

      if (error) throw error;
      setContacts(data || []);
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

  const uniqueOrganizations = useMemo(() => {
    const orgs = [...new Set(contacts.map(c => c.organization).filter(Boolean))];
    return orgs.sort();
  }, [contacts]);

  const isWithinDays = (dateString: string, days: number) => {
    if (!dateString || dateString === "1970-01-01T00:00:00+00:00") return false;
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
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Organization filter
      const orgMatch = selectedOrganizations.length === 0 || 
        (contact.organization && selectedOrganizations.includes(contact.organization));

      // Touch filter
      let touchMatch = true;
      if (touchedInDays !== "all") {
        const days = parseInt(touchedInDays);
        touchMatch = isWithinDays(contact.last_touch, days);
      }

      return searchMatch && orgMatch && touchMatch;
    });
  }, [contacts, searchTerm, selectedOrganizations, touchedInDays]);

  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredContacts.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredContacts, currentPage]);

  const totalPages = Math.ceil(filteredContacts.length / rowsPerPage);

  const formatRelativeTime = (dateString: string) => {
    if (!dateString || dateString === "1970-01-01T00:00:00+00:00") return "Never";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const toggleOrganization = (org: string) => {
    setSelectedOrganizations(prev => 
      prev.includes(org) 
        ? prev.filter(o => o !== org)
        : [...prev, org]
    );
  };

  const handleContactAdded = () => {
    fetchContacts();
    setShowAddDialog(false);
  };

  const handleContactUpdated = () => {
    fetchContacts();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Contacts ({filteredContacts.length})</span>
            </CardTitle>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
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
                  {selectedOrganizations.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedOrganizations([])}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Select value={touchedInDays} onValueChange={setTouchedInDays}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Touched in..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Focus Areas</TableHead>
                  <TableHead>Emails</TableHead>
                  <TableHead>Meetings</TableHead>
                  <TableHead>Opportunities</TableHead>
                  <TableHead>Last Touch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchTerm || selectedOrganizations.length > 0 || touchedInDays !== "all" 
                            ? "No contacts match your filters" 
                            : "No contacts yet"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedContacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="hover:bg-table-row-hover transition-colors cursor-pointer"
                      onClick={() => setSelectedContact(contact)}
                    >
                      <TableCell className="font-medium">
                        {contact.full_name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.email || "—"}
                      </TableCell>
                      <TableCell>{contact.organization || "—"}</TableCell>
                      <TableCell>{contact.title || "—"}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {contact.focus_areas || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {contact.emails_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {contact.meetings_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {contact.opportunities_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(contact.last_touch)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredContacts.length)} of {filteredContacts.length} contacts
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ContactDrawer
        contact={selectedContact}
        open={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        onContactUpdated={handleContactUpdated}
      />

      <AddContactDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onContactAdded={handleContactAdded}
      />
    </div>
  );
}