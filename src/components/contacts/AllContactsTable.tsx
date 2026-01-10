import { useState, useMemo, useEffect } from "react";
import { useAllContactsView, AllContactView } from "@/hooks/useAllContactsView";
import { ResponsiveAdvancedTable, ColumnDef } from "@/components/shared/ResponsiveAdvancedTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Mail, User, Users, Calendar, Loader2, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ContactDrawer } from "./ContactDrawer";
import { GroupContactDrawer } from "./GroupContactDrawer";
import { toast } from "sonner";
import { useContactDraftGenerator } from "@/hooks/useContactDraftGenerator";
import { sendGroupEmail } from "@/features/contacts/sendGroupEmail";
import { supabase } from "@/integrations/supabase/client";
import type { GroupContactView } from "@/types/contact";
import { useQueryClient } from "@tanstack/react-query";
import { MultiSortDialog, SortLevel, ColumnOption } from "@/components/shared/MultiSortDialog";
import { SortChips } from "@/components/shared/SortChips";
import { loadSortState, saveSortState, clearSortState, applyClientSort } from "@/lib/sort/customSort";

function parseFlexibleDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function AllContactsTable() {
  const queryClient = useQueryClient();
  const { data: contacts, isLoading, error } = useAllContactsView();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupContactView | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([]);
  const [isSortDialogOpen, setIsSortDialogOpen] = useState(false);
  
  // Use unified draft generator
  const { generateDraft, isGenerating: isDraftGenerating } = useContactDraftGenerator();

  // Load persisted sort state on mount
  useEffect(() => {
    const savedSort = loadSortState('all_contacts_view');
    if (savedSort.length > 0) {
      setSortLevels(savedSort);
    }
  }, []);

  // Fetch individual contact when selected
  useEffect(() => {
    if (!selectedContactId) {
      setSelectedContact(null);
      return;
    }

    const fetchContact = async () => {
      setLoadingContact(true);
      try {
        const { data, error } = await supabase
          .from('contacts_raw')
          .select('*')
          .eq('id', selectedContactId)
          .maybeSingle();
        
        if (error) throw error;
        if (!data) {
          toast.error('Contact not found');
          setSelectedContactId(null);
          return;
        }
        setSelectedContact(data);
      } catch (err) {
        console.error('Error fetching contact:', err);
        toast.error('Failed to load contact details');
        setSelectedContactId(null);
      } finally {
        setLoadingContact(false);
      }
    };

    fetchContact();
  }, [selectedContactId]);

  // Fetch group when selected - refetch function to get latest data
  const fetchGroup = async () => {
    if (!selectedGroupId) {
      setSelectedGroup(null);
      return;
    }

    setLoadingGroup(true);
    try {
      const { data, error } = await supabase.rpc('get_group_contacts_view');
      
      if (error) throw error;
      
      const group = data.find((g: any) => g.group_id === selectedGroupId);
      if (group) {
        const membersData = typeof group.members === 'string' 
          ? JSON.parse(group.members) 
          : (Array.isArray(group.members) ? group.members : []);
          
        setSelectedGroup({
          ...group,
          members: membersData
        } as GroupContactView);
      } else {
        toast.error('Group not found');
        setSelectedGroupId(null);
      }
    } catch (err) {
      console.error('Error fetching group:', err);
      toast.error('Failed to load group details');
      setSelectedGroupId(null);
    } finally {
      setLoadingGroup(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [selectedGroupId]);

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    
    let result = contacts;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(contact => 
        contact.name?.toLowerCase().includes(term) ||
        contact.organization?.toLowerCase().includes(term) ||
        contact.member_names?.toLowerCase().includes(term) ||
        contact.opportunities?.toLowerCase().includes(term) ||
        contact.focus_area?.toLowerCase().includes(term) ||
        contact.sector?.toLowerCase().includes(term)
      );
    }
    
    // Apply client-side sorting
    return applyClientSort(result, sortLevels);
  }, [contacts, searchTerm, sortLevels]);

  const handleRowClick = (row: AllContactView) => {
    if (row.contact_type === 'individual') {
      setSelectedContactId(row.id);
      setSelectedGroupId(null);
    } else {
      setSelectedGroupId(row.id);
      setSelectedContactId(null);
    }
  };

  const handleSendEmail = async (row: AllContactView) => {
    try {
      if (row.contact_type === 'group') {
        await sendGroupEmail(row.id);
        toast.success("Group email workflow triggered successfully");
      } else {
        await generateDraft(row.id);
        // Toast is handled by the hook
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error(`Failed to trigger email workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const columns: ColumnDef<AllContactView>[] = [
    {
      key: "name",
      label: "Name",
      sticky: true,
      sortable: true,
      render: (value: any, row: AllContactView) => (
        <div className="flex items-center gap-2">
          {row.contact_type === 'individual' ? (
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{row.name || 'Unknown'}</div>
            <div className="text-xs text-muted-foreground">
              {row.contact_type === 'individual' ? (
                <span className="truncate">{row.organization || 'No organization'}</span>
              ) : (
                <div className="space-y-0.5">
                  <div className="truncate">{row.member_count || 0} members</div>
                  {row.member_names && (
                    <div 
                      className="text-[10px] text-muted-foreground/70 truncate"
                      title={row.member_names}
                    >
                      {row.member_names.split(',').map(name => name.trim().split(' ')[0]).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "contact_type",
      label: "Type",
      sortable: true,
      render: (value: any, row: AllContactView) => (
        <Badge variant={row.contact_type === 'individual' ? 'default' : 'secondary'}>
          {row.contact_type === 'individual' ? 'Individual' : 'Group'}
        </Badge>
      ),
    },
    {
      key: "max_lag_days",
      label: "Max Lag",
      sortable: true,
      render: (value: any, row: AllContactView) => {
        const days = row.max_lag_days;
        return days ? (
          <Badge variant={days > 90 ? "destructive" : "secondary"}>
            {days} days
          </Badge>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "most_recent_contact",
      label: "Most Recent",
      sortable: true,
      render: (value: any, row: AllContactView) => {
        const date = parseFlexibleDate(row.most_recent_contact);
        return date ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{format(date, 'MMM d, yyyy')}</span>
          </div>
        ) : <span className="text-muted-foreground">Never</span>;
      },
    },
    {
      key: "next_outreach_date",
      label: "Next Outreach",
      sortable: true,
      render: (value: any, row: AllContactView) => {
        const date = parseFlexibleDate(row.next_outreach_date);
        return date ? (
          <Badge variant={row.is_overdue ? "destructive" : "secondary"}>
            {format(date, 'MMM d, yyyy')}
          </Badge>
        ) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "days_over_under_max_lag",
      label: "Over/Under",
      sortable: true,
      render: (value: any, row: AllContactView) => {
        const days = row.days_over_under_max_lag;
        if (days === null || days === undefined) return <span className="text-muted-foreground">—</span>;
        const isNegative = days < 0;
        return (
          <Badge variant={isNegative ? "destructive" : "default"}>
            {days > 0 ? '+' : ''}{days}
          </Badge>
        );
      },
    },
    {
      key: "focus_area",
      label: "Focus Area",
      sortable: true,
      render: (value: any, row: AllContactView) => 
        row.focus_area ? (
          <div className="max-w-[200px] truncate" title={row.focus_area}>
            <Badge variant="outline">{row.focus_area}</Badge>
          </div>
        ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "sector",
      label: "Sector",
      sortable: true,
      render: (value: any, row: AllContactView) => 
        row.sector ? (
          <Badge variant="outline">{row.sector}</Badge>
        ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "opportunities",
      label: "Opportunities",
      render: (value: any, row: AllContactView) => (
        <div className="flex items-center gap-2">
          {row.opportunity_count > 0 ? (
            <>
              <Badge variant="secondary">{row.opportunity_count}</Badge>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={row.opportunities || undefined}>
                {row.opportunities}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </div>
      ),
    },
    {
      key: "details",
      label: "Details",
      render: (value: any, row: AllContactView) => {
        if (row.contact_type === 'individual') {
          return (
            <div className="text-sm max-w-[250px]">
              {row.title && <div className="text-muted-foreground truncate" title={row.title}>{row.title}</div>}
              {row.organization && <div className="font-medium truncate" title={row.organization}>{row.organization}</div>}
            </div>
          );
        } else {
          return (
            <div className="text-sm text-muted-foreground truncate max-w-[250px]" title={row.member_names || undefined}>
              {row.member_names || 'No members'}
            </div>
          );
        }
      },
    },
    {
      key: "actions",
      label: "Actions",
      enableHiding: false,
      render: (_: any, row: AllContactView) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(row);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleSendEmail(row);
            }}
            disabled={isDraftGenerating && row.contact_type === 'individual'}
          >
            {isDraftGenerating && row.contact_type === 'individual' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  // Create column options for sort dialog
  const columnOptions: ColumnOption[] = useMemo(() => {
    return columns
      .filter(col => col.sortable)
      .map(col => ({
        key: col.key,
        label: col.label,
      }));
  }, []);

  // Handle multi-sort changes
  const handleSortChange = (newSortLevels: SortLevel[]) => {
    setSortLevels(newSortLevels);
    saveSortState('all_contacts_view', newSortLevels);
  };

  // Clear sort
  const handleClearSort = () => {
    setSortLevels([]);
    clearSortState('all_contacts_view');
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">Error loading contacts: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Chips */}
      <SortChips
        sortLevels={sortLevels}
        columns={columnOptions}
        onClear={handleClearSort}
        className="mb-2"
      />

      {/* Header with Sort Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {filteredContacts.length} Contact{filteredContacts.length !== 1 ? 's' : ''} & Group{filteredContacts.length !== 1 ? 's' : ''}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSortDialogOpen(true)}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Sort
        </Button>
      </div>

      <ResponsiveAdvancedTable
        data={filteredContacts || []}
        columns={columns}
        loading={isLoading}
        onRowClick={handleRowClick}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        emptyState={{
          title: "No contacts found",
          description: "Start by adding individual contacts or creating groups"
        }}
        tableId="all-contacts"
        enableColumnReordering={true}
        enableResizing={true}
        persistKey="all-contacts"
      />

      {/* Drawers */}
      {selectedContact && (
        <ContactDrawer
          contact={selectedContact}
          open={!!selectedContactId && !loadingContact}
          onClose={() => {
            setSelectedContactId(null);
            setSelectedContact(null);
          }}
          onContactUpdated={() => {
            // Invalidate all views for sync
            queryClient.invalidateQueries({ queryKey: ['all-contacts-view'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
          }}
        />
      )}

      {selectedGroup && (
        <GroupContactDrawer
          group={selectedGroup}
          open={!!selectedGroupId && !loadingGroup}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedGroupId(null);
              setSelectedGroup(null);
            }
          }}
          onUpdate={() => {
            // Re-fetch group data to reflect changes immediately
            fetchGroup();
            // Also invalidate all views for sync
            queryClient.invalidateQueries({ queryKey: ['all-contacts-view'] });
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
          }}
        />
      )}

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
