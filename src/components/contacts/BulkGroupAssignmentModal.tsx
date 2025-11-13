import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useGroups } from "@/hooks/useGroups";
import { useAddContactToGroup } from "@/hooks/useAddContactToGroup";
import { useValidateGroupMembership } from "@/hooks/useValidateGroupMembership";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, Plus, AlertTriangle } from "lucide-react";
import { useSectors, useFocusAreas } from "@/hooks/useLookups";

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
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [groupDelta, setGroupDelta] = useState<string>("");
  const [groupFocusArea, setGroupFocusArea] = useState<string>("");
  const [groupSector, setGroupSector] = useState<string>("");
  const [groupNotes, setGroupNotes] = useState<string>("");
  const [emailRoles, setEmailRoles] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const queryClient = useQueryClient();
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const addToGroup = useAddContactToGroup();
  const validateMembership = useValidateGroupMembership();
  
  // Fetch canonical lookup options
  const { data: sectorOptions = [] } = useSectors();
  const { data: focusAreaOptions = [] } = useFocusAreas();

  const handleAssign = async () => {
    // Validation
    if (mode === "new") {
      if (!newGroupName.trim()) {
        toast({
          title: "Group name required",
          description: "Please enter a group name",
          variant: "destructive",
        });
        return;
      }
      if (!groupDelta || !groupDelta.trim()) {
        toast({
          title: "Group max lag days required",
          description: "Please enter the max lag days for this group",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (selectedGroupIds.length === 0) {
        toast({
          title: "No groups selected",
          description: "Please select at least one group",
          variant: "destructive",
        });
        return;
      }
    }

    if (!selectedContacts || selectedContacts.length === 0) {
      toast({
        title: "No contacts selected",
        description: "Please select at least one contact",
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
      if (mode === "new") {
        // Create new group first
        const { data: newGroup, error: groupError } = await supabase
          .from('groups')
          .insert({
            name: newGroupName.trim(),
            max_lag_days: parseInt(groupDelta),
            focus_area: groupFocusArea.trim() || null,
            sector: groupSector.trim() || null,
            notes: groupNotes.trim() || null,
          })
          .select()
          .single();

        if (groupError) throw groupError;

        // Add all contacts to this new group
        for (const contact of selectedContacts) {
          await addToGroup.mutateAsync({
            contactId: contact.id,
            groupId: newGroup.id,
            emailRole: emailRoles[contact.id] as 'to' | 'cc' | 'bcc',
          });
        }

        toast({
          title: "Success",
          description: `Created group "${newGroupName}" with ${selectedContacts.length} member${selectedContacts.length > 1 ? 's' : ''}`,
        });
      } else {
        // Add contacts to selected existing groups with validation
        let totalAdded = 0;
        const validationErrors: string[] = [];
        
        for (const groupId of selectedGroupIds) {
          for (const contact of selectedContacts) {
            try {
              // Validate before adding
              await validateMembership.mutateAsync({
                contactId: contact.id,
                newGroupId: groupId,
              });
              
              // If validation passes, add to group
              await addToGroup.mutateAsync({
                contactId: contact.id,
                groupId: groupId,
                emailRole: emailRoles[contact.id] as 'to' | 'cc' | 'bcc',
              });
              totalAdded++;
            } catch (validationError: any) {
              validationErrors.push(`${contact.full_name}: ${validationError.message}`);
            }
          }
        }
        
        // Show validation errors if any
        if (validationErrors.length > 0) {
          toast({
            title: "Validation Warnings",
            description: (
              <div className="space-y-1">
                <p>Some contacts could not be added:</p>
                <ul className="list-disc list-inside text-xs">
                  {validationErrors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {validationErrors.length > 3 && (
                    <li>...and {validationErrors.length - 3} more</li>
                  )}
                </ul>
              </div>
            ),
            variant: "destructive",
          });
        }

        toast({
          title: "Success",
          description: `Added ${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''} to ${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? 's' : ''}`,
        });
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-members-new'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });

      onSuccess();
      onOpenChange(false);
      
      // Reset state
      setSelectedGroupIds([]);
      setNewGroupName("");
      setGroupDelta("");
      setGroupFocusArea("");
      setGroupSector("");
      setGroupNotes("");
      setEmailRoles({});
      setMode("existing");
    } catch (error: any) {
      console.error("Error managing group memberships:", error);
      
      toast({
        title: "Error",
        description: error?.message || "Failed to manage group memberships",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add to Group{selectedContacts.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Add {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} to one or more groups. Contacts can be in multiple groups simultaneously.
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
              <Label>Select Groups (can select multiple)</Label>
              {loadingGroups ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading groups...
                </div>
              ) : (
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="space-y-2">
                    {groups?.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedGroupIds.includes(group.id)}
                          onCheckedChange={() => toggleGroupSelection(group.id)}
                        />
                        <label
                          htmlFor={`group-${group.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {group.name}
                          {group.max_lag_days && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Max lag: {group.max_lag_days} days)
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <p className="text-xs text-muted-foreground">
                Selected: {selectedGroupIds.length} group{selectedGroupIds.length !== 1 ? 's' : ''}
              </p>
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
          
          {/* Show group metadata fields only for NEW groups */}
          {mode === "new" && (
            <>
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
                  This applies to all contacts in the group
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-focus-area">Group Focus Area</Label>
                <Select value={groupFocusArea} onValueChange={setGroupFocusArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select focus area..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {focusAreaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-sector">Group Sector</Label>
                <Select value={groupSector} onValueChange={setGroupSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {sectorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-notes">Group Notes</Label>
                <Textarea
                  id="group-notes"
                  placeholder="Add notes for this group..."
                  value={groupNotes}
                  onChange={(e) => setGroupNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

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
            <ScrollArea className="h-[120px] rounded-md border p-4">
              <div className="space-y-1">
                {selectedContacts.map((contact) => (
                  <div key={contact.id} className="text-sm">
                    {contact.full_name || "Unknown"}
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
                {mode === "new" ? "Creating..." : "Adding..."}
              </>
            ) : (
              mode === "new" ? "Create Group & Add Contacts" : "Add to Selected Groups"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
