import { useState } from "react";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { GroupContactDrawer } from "./GroupContactDrawer";
import { Button } from "@/components/ui/button";
import { Mail, Users, Eye, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGroupContactsView } from "@/hooks/useGroupContactsView";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import type { GroupContactView } from "@/types/contact";
import { buildGroupEmailPayload } from "@/lib/groupEmailPayload";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { EditToolbar } from "@/components/shared/EditToolbar";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function GroupContactsTable() {
  const [selectedGroup, setSelectedGroup] = useState<GroupContactView | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<string, { 
    max_lag_days?: number;
    group_focus_area?: string;
    group_sector?: string;
  }>>({});
  const [editingCell, setEditingCell] = useState<{ groupId: string; field: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading, error, refetch } = useGroupContactsView();

  const handleRowClick = (group: GroupContactView) => {
    setSelectedGroup(group);
    setIsDrawerOpen(true);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      for (const [groupId, edits] of Object.entries(editedRows)) {
        // Prepare the update object for the groups table
        const updateData: any = { updated_at: new Date().toISOString() };
        
        if ('max_lag_days' in edits) {
          updateData.max_lag_days = edits.max_lag_days;
        }
        if ('group_focus_area' in edits) {
          updateData.focus_area = edits.group_focus_area;
        }
        if ('group_sector' in edits) {
          updateData.sector = edits.group_sector;
        }

        // Update the group table directly
        const { error: updateError } = await supabase
          .from('groups')
          .update(updateData)
          .eq('id', groupId);

        if (updateError) throw updateError;
      }

      toast({
        title: "Changes Saved",
        description: `Updated ${Object.keys(editedRows).length} group(s)`,
      });

      setEditedRows({});
      setEditMode(false);
      
      // Invalidate both group contacts view and individual contacts queries
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      refetch();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setEditedRows({});
    setEditingCell(null);
    setEditMode(false);
  };

  const handleSendEmail = async (group: GroupContactView) => {
    try {
      const payload = buildGroupEmailPayload(group);
      
      const response = await fetch('https://inverisllc.app.n8n.cloud/webhook/Group-Contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }
      
      toast({
        title: "Email Sent",
        description: `Group email sent for: ${group.group_name}`,
      });
    } catch (error) {
      console.error('Error sending group email:', error);
      toast({
        title: "Error",
        description: "Failed to send group email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      key: "group_name",
      label: "Group Name",
      render: (value: any, row: GroupContactView) => (
        <div className="font-medium">{row.group_name}</div>
      ),
      sortable: true,
      sticky: true,
    },
    {
      key: "members",
      label: "Members",
      render: (value: any, row: GroupContactView) => {
        const names = typeof row.member_names === 'string' && row.member_names.trim().length > 0
          ? row.member_names
          : Array.isArray(row.members)
            ? row.members
                .map(m => (m.full_name || '').split(' ')[0])
                .filter(Boolean)
                .join(', ')
            : 'No members';

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {row.member_count} member{row.member_count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-sm text-muted-foreground truncate max-w-[250px]" title={names || undefined}>
              {names || 'No members'}
            </div>
          </div>
        );
      },
    },
    {
      key: "max_lag_days",
      label: "Max Lag Days",
      render: (value: any, row: GroupContactView) => {
        const isEditing = editingCell?.groupId === row.group_id && editingCell?.field === 'max_lag_days';
        const currentValue = editedRows[row.group_id]?.max_lag_days ?? row.max_lag_days;

        if (editMode && !isEditing) {
          return (
            <div 
              onClick={() => setEditingCell({ groupId: row.group_id, field: 'max_lag_days' })}
              className="cursor-pointer hover:bg-accent p-1 rounded"
            >
              {currentValue ? (
                <Badge variant={currentValue > 90 ? "destructive" : "secondary"}>
                  {currentValue} days
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          );
        }

        if (isEditing) {
          return (
            <Input
              type="number"
              value={currentValue || ''}
              onChange={(e) => {
                const newValue = parseInt(e.target.value);
                if (!isNaN(newValue)) {
                  setEditedRows(prev => ({
                    ...prev,
                    [row.group_id]: { ...prev[row.group_id], max_lag_days: newValue }
                  }));
                }
              }}
              onBlur={() => setEditingCell(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingCell(null);
                if (e.key === 'Escape') {
                  setEditedRows(prev => {
                    const newRows = { ...prev };
                    delete newRows[row.group_id];
                    return newRows;
                  });
                  setEditingCell(null);
                }
              }}
              autoFocus
              className="w-24"
              min="0"
              max="365"
            />
          );
        }

        const days = row.max_lag_days;
        return days ? (
          <Badge variant={days > 90 ? "destructive" : "secondary"}>
            {days} days
          </Badge>
        ) : <span className="text-muted-foreground">-</span>;
      },
      sortable: true,
    },
    {
      key: "group_focus_area",
      label: "Group Focus Area",
      render: (value: any, row: GroupContactView) => {
        const isEditing = editingCell?.groupId === row.group_id && editingCell?.field === 'group_focus_area';
        const currentValue = editedRows[row.group_id]?.group_focus_area ?? row.group_focus_area;

        if (editMode && !isEditing) {
          return (
            <div 
              onClick={() => setEditingCell({ groupId: row.group_id, field: 'group_focus_area' })}
              className="cursor-pointer hover:bg-accent p-1 rounded"
            >
              {currentValue ? (
                <Badge variant="outline">{currentValue}</Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          );
        }

        if (isEditing) {
          return (
            <Input
              type="text"
              value={currentValue || ''}
              onChange={(e) => {
                setEditedRows(prev => ({
                  ...prev,
                  [row.group_id]: { ...prev[row.group_id], group_focus_area: e.target.value }
                }));
              }}
              onBlur={() => setEditingCell(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingCell(null);
                if (e.key === 'Escape') {
                  setEditedRows(prev => {
                    const newRows = { ...prev };
                    if (newRows[row.group_id]) {
                      delete newRows[row.group_id].group_focus_area;
                      if (Object.keys(newRows[row.group_id]).length === 0) {
                        delete newRows[row.group_id];
                      }
                    }
                    return newRows;
                  });
                  setEditingCell(null);
                }
              }}
              autoFocus
              className="w-full"
            />
          );
        }

        return row.group_focus_area ? (
          <Badge variant="outline">{row.group_focus_area}</Badge>
        ) : <span className="text-muted-foreground">-</span>;
      },
      sortable: true,
    },
    {
      key: "group_sector",
      label: "Group Sector",
      render: (value: any, row: GroupContactView) => {
        const isEditing = editingCell?.groupId === row.group_id && editingCell?.field === 'group_sector';
        const currentValue = editedRows[row.group_id]?.group_sector ?? row.group_sector;

        if (editMode && !isEditing) {
          return (
            <div 
              onClick={() => setEditingCell({ groupId: row.group_id, field: 'group_sector' })}
              className="cursor-pointer hover:bg-accent p-1 rounded"
            >
              {currentValue ? (
                <Badge variant="outline">{currentValue}</Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          );
        }

        if (isEditing) {
          return (
            <Input
              type="text"
              value={currentValue || ''}
              onChange={(e) => {
                setEditedRows(prev => ({
                  ...prev,
                  [row.group_id]: { ...prev[row.group_id], group_sector: e.target.value }
                }));
              }}
              onBlur={() => setEditingCell(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingCell(null);
                if (e.key === 'Escape') {
                  setEditedRows(prev => {
                    const newRows = { ...prev };
                    if (newRows[row.group_id]) {
                      delete newRows[row.group_id].group_sector;
                      if (Object.keys(newRows[row.group_id]).length === 0) {
                        delete newRows[row.group_id];
                      }
                    }
                    return newRows;
                  });
                  setEditingCell(null);
                }
              }}
              autoFocus
              className="w-full"
            />
          );
        }

        return row.group_sector ? (
          <Badge variant="outline">{row.group_sector}</Badge>
        ) : <span className="text-muted-foreground">-</span>;
      },
      sortable: true,
    },
    {
      key: "most_recent_contact",
      label: "Most Recent Contact",
      render: (value: any, row: GroupContactView) => {
        const date = parseFlexibleDate(row.most_recent_contact);
        return date ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(date, 'yyyy-MM-dd')}
          </div>
        ) : <span className="text-muted-foreground">Never</span>;
      },
      sortable: true,
    },
    {
      key: "days_since_last_contact",
      label: "Days Since",
      render: (value: any, row: GroupContactView) => {
        const days = row.days_since_last_contact;
        return days !== null && days !== undefined
          ? <Badge variant="secondary">{days}d</Badge>
          : <span className="text-muted-foreground">—</span>;
      },
      sortable: true,
    },
    {
      key: "days_over_under_max_lag",
      label: "Over/Under",
      render: (value: any, row: GroupContactView) => {
        const days = row.days_over_under_max_lag;
        if (days === null || days === undefined) return <span className="text-muted-foreground">—</span>;
        const isNegative = days < 0;
        return (
          <Badge variant={isNegative ? "destructive" : "default"}>
            {days > 0 ? '+' : ''}{days}
          </Badge>
        );
      },
      sortable: true,
    },
    {
      key: "next_outreach_date",
      label: "Next Outreach",
      render: (value: any, row: GroupContactView) => {
        const date = parseFlexibleDate(row.next_outreach_date);
        return date ? (
          <Badge variant={row.is_overdue ? "destructive" : "secondary"}>
            {format(date, 'yyyy-MM-dd')}
          </Badge>
        ) : <span className="text-muted-foreground">—</span>;
      },
      sortable: true,
    },
    {
      key: "is_over_max_lag",
      label: "Over Max Lag",
      render: (value: any, row: GroupContactView) => (
        row.is_over_max_lag
          ? <Badge variant="destructive">Yes</Badge>
          : <span className="text-muted-foreground">No</span>
      ),
    },
    {
      key: "opportunities",
      label: "Opportunities",
      render: (value: any, row: GroupContactView) => (
        <div className="flex items-center gap-2">
          {row.opportunity_count > 0 ? (
            <>
              <Badge variant="secondary">{row.opportunity_count}</Badge>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
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
      key: "actions",
      label: "Actions",
      enableHiding: false,
      render: (_: any, row: GroupContactView) => (
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
          >
            <Mail className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Error loading group contacts: {error.message}
      </div>
    );
  }

  const filteredGroups = groups.filter((group) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      group.group_name.toLowerCase().includes(search) ||
      group.member_names?.toLowerCase().includes(search) ||
      group.opportunities?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <EditToolbar
        editMode={editMode}
        onToggleEditMode={() => setEditMode(!editMode)}
        editedRowsCount={Object.keys(editedRows).length}
        onSave={handleSaveChanges}
        onDiscard={handleDiscardChanges}
        isSaving={isSaving}
      />
      
      <ResponsiveAdvancedTable
        data={filteredGroups}
        columns={columns}
        loading={isLoading}
        onRowClick={editMode ? undefined : handleRowClick}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        tableId="group_contacts_view"
        emptyState={{
          title: "No group contacts found",
          description: "Create groups by assigning contacts to a group in the individual contacts view."
        }}
        exportFilename="group-contacts"
        enableColumnReordering={true}
        tableType="contacts"
      />

      <GroupContactDrawer
        group={selectedGroup}
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) setSelectedGroup(null);
        }}
        onUpdate={refetch}
      />
    </div>
  );
}
