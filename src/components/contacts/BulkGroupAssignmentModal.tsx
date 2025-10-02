import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGroupContacts } from "@/hooks/useGroupContacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";

interface BulkGroupAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Array<{ id: string; full_name: string; group_contact?: string }>;
  onSuccess: () => void;
}

export function BulkGroupAssignmentModal({
  open,
  onOpenChange,
  selectedContacts,
  onSuccess,
}: BulkGroupAssignmentModalProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const queryClient = useQueryClient();
  const { data: groupOptions, isLoading: loadingGroups } = useGroupContacts();

  const handleAssign = async () => {
    const groupName = mode === "existing" ? selectedGroup : newGroupName.trim();

    // Validation
    if (!groupName) {
      toast({
        title: "Group name required",
        description: "Please select or enter a group name",
        variant: "destructive",
      });
      return;
    }

    if (!selectedContacts || selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const contactIds = selectedContacts.map(c => c.id).filter(Boolean);
      
      if (contactIds.length === 0) {
        throw new Error("No valid contact IDs found");
      }

      console.log('Assigning contacts to group:', { groupName, contactIds });

      const { data, error } = await supabase
        .from("contacts_raw")
        .update({ group_contact: groupName })
        .in("id", contactIds)
        .select();

      if (error) {
        console.error("Supabase error details:", error);
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }

      if (!data || data.length === 0) {
        console.warn("Update returned no data, but no error");
      }

      console.log('Successfully updated contacts:', data?.length || 0);

      toast({
        title: "Success",
        description: `${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''} assigned to ${groupName}`,
      });

      // Invalidate related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['group-members', groupName] });
      queryClient.invalidateQueries({ queryKey: ['group-contacts'] });
      contactIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ['contact-group-info', id] });
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset state
      setSelectedGroup("");
      setNewGroupName("");
      setMode("existing");
    } catch (error: any) {
      console.error("Error assigning contacts to group:", error);
      
      const errorMessage = error?.message || "Failed to assign contacts to group";
      const errorDetails = error?.details || error?.hint || "";
      
      toast({
        title: "Error",
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const contactsWithGroups = selectedContacts.filter(c => c.group_contact);
  const hasExistingGroups = contactsWithGroups.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign to Group Contact
          </DialogTitle>
          <DialogDescription>
            Assign {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} to a group.
            {hasExistingGroups && (
              <span className="block mt-1 text-warning">
                Warning: {contactsWithGroups.length} contact{contactsWithGroups.length > 1 ? 's are' : ' is'} already in a group and will be reassigned.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Group Assignment</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "existing" | "new")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Select existing group</SelectItem>
                <SelectItem value="new">Create new group</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "existing" ? (
            <div className="space-y-2">
              <Label htmlFor="group-select">Select Group</Label>
              {loadingGroups ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading groups...
                </div>
              ) : (
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger id="group-select">
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions?.map((group) => (
                      <SelectItem key={group.value} value={group.value}>
                        {group.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="new-group">New Group Name</Label>
              <Input
                id="new-group"
                placeholder="Enter group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Selected Contacts ({selectedContacts.length})</Label>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-2">
                {selectedContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between text-sm">
                    <span>{contact.full_name || "Unknown"}</span>
                    {contact.group_contact && (
                      <span className="text-xs text-muted-foreground">
                        Currently in: {contact.group_contact}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign to Group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
