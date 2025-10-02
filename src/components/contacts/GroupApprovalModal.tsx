import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Mail } from "lucide-react";
import { useState } from "react";
import { GroupMember, GroupConflict } from "@/hooks/useSuggestGroups";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GroupApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;
  members: GroupMember[];
  conflicts: GroupConflict[];
  onApprove: (groupName: string, selectedContactIds: string[]) => void;
  isCreating: boolean;
}

export function GroupApprovalModal({
  open,
  onOpenChange,
  suggestedName,
  members,
  conflicts,
  onApprove,
  isCreating
}: GroupApprovalModalProps) {
  const [groupName, setGroupName] = useState(suggestedName);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(members.filter(m => m.contactId).map(m => m.contactId!))
  );

  const handleToggleMember = (contactId: string) => {
    const newSet = new Set(selectedMembers);
    if (newSet.has(contactId)) {
      newSet.delete(contactId);
    } else {
      newSet.add(contactId);
    }
    setSelectedMembers(newSet);
  };

  const handleApprove = () => {
    if (selectedMembers.size === 0) {
      return;
    }
    onApprove(groupName, Array.from(selectedMembers));
  };

  // Separate members into conflicted and non-conflicted
  const conflictedEmails = new Set(conflicts.map(c => c.email));
  const membersWithConflicts = members.filter(m => conflictedEmails.has(m.email));
  const membersWithoutConflicts = members.filter(m => !conflictedEmails.has(m.email) && m.contactId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Review & Approve Group
          </DialogTitle>
          <DialogDescription>
            Review the group details and select which members to include
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {conflicts.length} member(s) are already in other groups. They will be moved to this group if you approve.
              </AlertDescription>
            </Alert>
          )}

          {/* Members without conflicts */}
          {membersWithoutConflicts.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Available Members</Label>
              <div className="border rounded-lg divide-y">
                {membersWithoutConflicts.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedMembers.has(member.contactId!)}
                      onCheckedChange={() => handleToggleMember(member.contactId!)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {member.name || 'Unknown'}
                        </p>
                        {member.organization && (
                          <Badge variant="secondary" className="text-xs">
                            {member.organization}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members with conflicts */}
          {membersWithConflicts.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-destructive">
                Members Already in Groups
              </Label>
              <div className="border border-destructive/50 rounded-lg divide-y">
                {membersWithConflicts.map((member) => {
                  const conflict = conflicts.find(c => c.email === member.email);
                  if (!member.contactId) return null;
                  
                  return (
                    <div
                      key={member.email}
                      className="flex items-center gap-3 p-3 bg-destructive/5"
                    >
                      <Checkbox
                        checked={selectedMembers.has(member.contactId)}
                        onCheckedChange={() => handleToggleMember(member.contactId!)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {member.name || 'Unknown'}
                          </p>
                          <Badge variant="destructive" className="text-xs">
                            In: {conflict?.currentGroup}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Selected Members</span>
            <Badge variant="outline">{selectedMembers.size} selected</Badge>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={selectedMembers.size === 0 || !groupName.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
