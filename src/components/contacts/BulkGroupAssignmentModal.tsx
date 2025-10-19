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
  const [groupDelta, setGroupDelta] = useState<string>("");
  const [emailRoles, setEmailRoles] = useState<Record<string, string>>({});
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

    // Validate group_delta for ALL groups (new and existing)
    if (!groupDelta || !groupDelta.trim()) {
      toast({
        title: "Group max lag days required",
        description: "Please enter the max lag days for this group",
        variant: "destructive",
      });
      return;
    }
    
    const deltaValue = parseInt(groupDelta);
    if (isNaN(deltaValue) || deltaValue < 0) {
      toast({
        title: "Invalid max lag days",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    // Validate email roles
    const missingRoles = selectedContacts.filter(c => !emailRoles[c.id]);
    if (missingRoles.length > 0) {
      toast({
        title: "Email roles required",
        description: `Please assign email roles to all contacts (${missingRoles.length} missing)`,
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

      console.log('Assigning contacts to group:', { groupName, groupDelta, emailRoles, contactIds });

      // Use groupDelta from input for both new and existing groups
      const finalGroupDelta = parseInt(groupDelta);

      // Update each contact individually with their specific email role
      const updates = selectedContacts.map(async (contact) => {
        const { error } = await supabase
          .from("contacts_raw")
          .update({
            group_contact: groupName,
            group_email_role: emailRoles[contact.id],
            group_delta: finalGroupDelta,
          })
          .eq("id", contact.id);

        if (error) throw error;
      });

      await Promise.all(updates);

      // Update ALL members of the group with the new group_delta (not just selected contacts)
      const { error: groupDeltaError } = await supabase
        .from('contacts_raw')
        .update({ group_delta: finalGroupDelta })
        .eq('group_contact', groupName);

      if (groupDeltaError) {
        console.error('Error updating group_delta for all members:', groupDeltaError);
      }

      // After all updates, recalculate group contact date
      await supabase.rpc('recalculate_group_contact_date', {
        p_group_name: groupName
      });

      console.log('Successfully updated all contacts in group');

      toast({
        title: "Success",
        description: `${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''} assigned to ${groupName}`,
      });

      // Invalidate related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['group-members', groupName] });
      queryClient.invalidateQueries({ queryKey: ['group-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
      contactIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ['contact-group-info', id] });
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset state
      setSelectedGroup("");
      setNewGroupName("");
      setGroupDelta("");
      setEmailRoles({});
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
                <Select value={selectedGroup} onValueChange={(value) => {
                  setSelectedGroup(value);
                  // When selecting an existing group, fetch its group_delta
                  if (value) {
                    supabase
                      .from("contacts_raw")
                      .select("group_delta")
                      .eq("group_contact", value)
                      .limit(1)
                      .maybeSingle()
                      .then(({ data }) => {
                        if (data?.group_delta) {
                          setGroupDelta(data.group_delta.toString());
                        }
                      });
                  }
                }}>
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
            <>
              <div className="space-y-2">
                <Label htmlFor="new-group">New Group Name</Label>
                <Input
                  id="new-group"
                  placeholder="Enter group name..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
            </>
          )}
          
          {/* Group Max Lag - shown for BOTH new and existing groups */}
          <div className="space-y-2">
            <Label htmlFor="group-delta">Group Max Lag (Days) *</Label>
            <Input
              id="group-delta"
              type="number"
              min="0"
              placeholder="e.g., 90"
              value={groupDelta}
              onChange={(e) => setGroupDelta(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              {mode === "existing" 
                ? "This will update the max lag for all contacts in this group" 
                : "This applies to all contacts in the group"
              }
            </p>
          </div>

          {/* Email Role Assignment for Each Contact */}
          <div className="space-y-3">
            <Label>Assign Email Roles *</Label>
            <div className="space-y-2 border rounded-md p-3">
              {selectedContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm flex-1 truncate">{contact.full_name || "Unknown"}</span>
                  <Select
                    value={emailRoles[contact.id] || ""}
                    onValueChange={(value) => setEmailRoles({ ...emailRoles, [contact.id]: value })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to">To</SelectItem>
                      <SelectItem value="cc">CC</SelectItem>
                      <SelectItem value="bcc">BCC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

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
