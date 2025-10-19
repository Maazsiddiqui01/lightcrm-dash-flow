import { useState } from "react";
import { ResponsiveAdvancedTable } from "@/components/shared/ResponsiveAdvancedTable";
import { GroupContactDrawer } from "./GroupContactDrawer";
import { Button } from "@/components/ui/button";
import { Mail, Users, Eye, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGroupContactsView } from "@/hooks/useGroupContactsView";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { GroupContactView } from "@/types/contact";
import { buildGroupEmailPayload } from "@/lib/groupEmailPayload";
import { parseFlexibleDate } from "@/utils/dateUtils";

export function GroupContactsTable() {
  const [selectedGroup, setSelectedGroup] = useState<GroupContactView | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: groups = [], isLoading, error, refetch } = useGroupContactsView();

  const handleRowClick = (group: GroupContactView) => {
    setSelectedGroup(group);
    setIsDrawerOpen(true);
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
      id: "group_name",
      label: "Group Name",
      header: "Group Name",
      accessorKey: "group_name",
      cell: ({ row }: any) => (
        <div className="font-medium">{row.original.group_name}</div>
      ),
    },
    {
      key: "members",
      id: "members",
      label: "Members",
      header: "Members",
      cell: ({ row }: any) => {
        const group = row.original as GroupContactView;
        const names = Array.isArray(group.member_names)
          ? group.member_names.map((n: any) => typeof n === 'string' ? n : n.first_name || n.full_name).join(', ')
          : group.member_names;
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
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
      id: "max_lag_days",
      label: "Max Lag Days",
      header: "Max Lag Days",
      accessorKey: "max_lag_days",
      cell: ({ row }: any) => {
        const days = row.original.max_lag_days;
        return days ? (
          <Badge variant={days > 90 ? "destructive" : "secondary"}>
            {days} days
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "most_recent_contact",
      id: "most_recent_contact",
      label: "Most Recent Contact",
      header: "Most Recent Contact",
      accessorKey: "most_recent_contact",
      cell: ({ row }: any) => {
        const date = parseFlexibleDate(row.original.most_recent_contact);
        return date ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(date, 'yyyy-MM-dd')}
          </div>
        ) : (
          <span className="text-muted-foreground">Never</span>
        );
      },
    },
    {
      key: "days_since_last_contact",
      id: "days_since_last_contact",
      label: "Days Since",
      header: "Days Since",
      accessorKey: "days_since_last_contact",
      cell: ({ row }: any) => {
        const days = row.original.days_since_last_contact;
        return days !== null && days !== undefined ? (
          <Badge variant="secondary">{days}d</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "days_over_under_max_lag",
      id: "days_over_under_max_lag",
      label: "Over/Under",
      header: "Over/Under",
      accessorKey: "days_over_under_max_lag",
      cell: ({ row }: any) => {
        const days = row.original.days_over_under_max_lag;
        if (days === null || days === undefined) {
          return <span className="text-muted-foreground">—</span>;
        }
        const isNegative = days < 0;
        return (
          <Badge variant={isNegative ? "destructive" : "default"}>
            {days > 0 ? '+' : ''}{days}
          </Badge>
        );
      },
    },
    {
      key: "next_outreach_date",
      id: "next_outreach_date",
      label: "Next Outreach",
      header: "Next Outreach",
      accessorKey: "next_outreach_date",
      cell: ({ row }: any) => {
        const group = row.original as GroupContactView;
        const date = parseFlexibleDate(group.next_outreach_date);
        return date ? (
          <Badge variant={group.is_overdue ? "destructive" : "secondary"}>
            {format(date, 'yyyy-MM-dd')}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "is_over_max_lag",
      id: "is_over_max_lag",
      label: "Over Max Lag",
      header: "Over Max Lag",
      accessorKey: "is_over_max_lag",
      cell: ({ row }: any) => {
        const isOver = row.original.is_over_max_lag;
        return isOver ? (
          <Badge variant="destructive">Yes</Badge>
        ) : (
          <span className="text-muted-foreground">No</span>
        );
      },
    },
    {
      key: "opportunities",
      id: "opportunities",
      label: "Opportunities",
      header: "Opportunities",
      cell: ({ row }: any) => {
        const group = row.original as GroupContactView;
        return (
          <div className="flex items-center gap-2">
            {group.opportunity_count > 0 ? (
              <>
                <Badge variant="secondary">{group.opportunity_count}</Badge>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {group.opportunities}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      id: "actions",
      label: "Actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const group = row.original as GroupContactView;
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(group);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleSendEmail(group);
              }}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        );
      },
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
    <>
      <ResponsiveAdvancedTable
        data={filteredGroups}
        columns={columns}
        loading={isLoading}
        onRowClick={handleRowClick}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        tableId="group_contacts_view"
        emptyState={{
          title: "No group contacts found",
          description: "Create groups by assigning contacts to a group in the individual contacts view."
        }}
        exportFilename="group-contacts"
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
    </>
  );
}
