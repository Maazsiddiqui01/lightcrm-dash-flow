import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCircle, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignmentContactsTableProps {
  filterUserId: string | null;
  showUnassignedOnly: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function AssignmentContactsTable({
  filterUserId,
  showUnassignedOnly,
  selectedIds,
  onSelectionChange,
}: AssignmentContactsTableProps) {
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['assignment-contacts', filterUserId, showUnassignedOnly],
    queryFn: async () => {
      let query = supabase
        .from('contacts_raw')
        .select('id, full_name, email_address, organization, assigned_to, lg_sector, lg_focus_areas_comprehensive_list')
        .order('created_at', { ascending: false })
        .limit(100);

      if (showUnassignedOnly) {
        query = query.is('assigned_to', null);
      } else if (filterUserId) {
        query = query.eq('assigned_to', filterUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(contacts?.map(c => c.id) || []);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {showUnassignedOnly 
            ? "No unassigned contacts found" 
            : filterUserId 
            ? "No contacts assigned to this user" 
            : "No contacts found"}
        </p>
      </div>
    );
  }

  const allSelected = contacts.length > 0 && contacts.every(c => selectedIds.includes(c.id));
  const someSelected = contacts.some(c => selectedIds.includes(c.id));

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                className={someSelected && !allSelected ? "data-[state=checked]:bg-primary" : ""}
              />
            </TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Sector / Focus Areas</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow 
              key={contact.id}
              className={selectedIds.includes(contact.id) ? "bg-primary/5" : ""}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(contact.id)}
                  onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                  aria-label={`Select ${contact.full_name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {contact.full_name?.[0]?.toUpperCase() || <UserCircle className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{contact.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{contact.email_address}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm">{contact.organization || "—"}</p>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {contact.lg_sector && (
                    <Badge variant="secondary" className="text-xs">
                      {contact.lg_sector}
                    </Badge>
                  )}
                  {contact.lg_focus_areas_comprehensive_list && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {contact.lg_focus_areas_comprehensive_list}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {!contact.assigned_to && (
                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                    Unassigned
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
