import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, X, Plus, Loader2 } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { useAddContactToGroup } from '@/hooks/useAddContactToGroup';
import { useRemoveContactFromGroup } from '@/hooks/useRemoveContactFromGroup';
import { BulkGroupAssignmentModal } from './BulkGroupAssignmentModal';

interface ContactGroup {
  group_id: string;
  group_name: string;
  email_role: 'to' | 'cc' | 'bcc' | null;
  max_lag_days: number | null;
  focus_area: string | null;
  sector: string | null;
}

interface ContactGroupsSectionProps {
  contactId: string;
  contactFullName: string;
  contactEmail: string;
  groups: ContactGroup[];
  isLoading: boolean;
}

export function ContactGroupsSection({
  contactId,
  contactFullName,
  contactEmail,
  groups,
  isLoading,
}: ContactGroupsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'to' | 'cc' | 'bcc'>('to');
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  const { data: allGroups = [], isLoading: isLoadingGroups } = useGroups();
  const addToGroupMutation = useAddContactToGroup();
  const removeFromGroupMutation = useRemoveContactFromGroup();

  // Filter out groups the contact is already in
  const availableGroups = allGroups.filter(
    (g) => !groups.some((m) => m.group_id === g.id)
  );

  const handleAddToGroup = () => {
    if (!selectedGroupId) return;
    
    addToGroupMutation.mutate(
      { contactId, groupId: selectedGroupId, emailRole: selectedRole },
      {
        onSuccess: () => {
          setSelectedGroupId('');
          setSelectedRole('to');
          setIsAddOpen(false);
        },
      }
    );
  };

  const handleRemoveFromGroup = (groupId: string) => {
    removeFromGroupMutation.mutate({ contactId, groupId });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Groups</Label>
      
      {/* Current group memberships */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading groups...</span>
        </div>
      ) : groups.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {groups.map((membership) => (
            <div
              key={membership.group_id}
              className="flex items-center gap-1 px-2 py-1 border rounded-md bg-muted/30"
            >
              <span className="text-sm font-medium">{membership.group_name}</span>
              {membership.email_role && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  {membership.email_role.toUpperCase()}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-destructive/20"
                onClick={() => handleRemoveFromGroup(membership.group_id)}
                disabled={removeFromGroupMutation.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Not a member of any groups</p>
      )}

      {/* Add to group & Create new group buttons */}
      <div className="flex gap-2">
        <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-3 w-3" />
              Add to Group
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-3">
              <Label className="text-sm">Select Group</Label>
              <Command className="border rounded-md">
                <CommandInput placeholder="Search groups..." />
                <CommandList>
                  <CommandEmpty>No groups found</CommandEmpty>
                  <CommandGroup>
                    {availableGroups.map((group) => (
                      <CommandItem
                        key={group.id}
                        value={group.name}
                        onSelect={() => setSelectedGroupId(group.id)}
                        className={selectedGroupId === group.id ? 'bg-accent' : ''}
                      >
                        <span>{group.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>

              {selectedGroupId && (
                <div className="space-y-2">
                  <Label className="text-sm">Email Role</Label>
                  <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to">TO</SelectItem>
                      <SelectItem value="cc">CC</SelectItem>
                      <SelectItem value="bcc">BCC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddOpen(false);
                    setSelectedGroupId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddToGroup}
                  disabled={!selectedGroupId || addToGroupMutation.isPending}
                >
                  {addToGroupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setCreateGroupModalOpen(true)}
        >
          <Users className="h-3 w-3" />
          Create New Group
        </Button>
      </div>

      {/* Create Group Modal - Pre-fill with this contact */}
      <BulkGroupAssignmentModal
        open={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
        selectedContacts={[
          {
            id: contactId,
            full_name: contactFullName,
          },
        ]}
        onSuccess={() => setCreateGroupModalOpen(false)}
      />
    </div>
  );
}
