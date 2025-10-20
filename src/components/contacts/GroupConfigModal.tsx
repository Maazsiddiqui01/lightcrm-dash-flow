import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useDistinctFocusAreas } from '@/hooks/useDistinctFocusAreas';
import { useDistinctSectors } from '@/hooks/useDistinctSectors';

interface GroupConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;
  members: Array<{ contactId: string; email: string; name: string }>;
  sector?: string;
  organization?: string;
}

export function GroupConfigModal({
  open,
  onOpenChange,
  suggestedName,
  members,
  sector,
  organization
}: GroupConfigModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  
  const [groupName, setGroupName] = useState(suggestedName);
  const [maxLagDays, setMaxLagDays] = useState<string>('30');
  const [focusArea, setFocusArea] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>(sector || '');
  const [memberRoles, setMemberRoles] = useState<Record<string, 'to' | 'cc' | 'bcc'>>(
    Object.fromEntries(members.map(m => [m.contactId, 'to' as const]))
  );

  const { data: focusAreas = [] } = useDistinctFocusAreas();
  const { data: sectors = [] } = useDistinctSectors();

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    if (!maxLagDays || parseInt(maxLagDays) <= 0) {
      toast({
        title: "Error",
        description: "Max lag days must be a positive number",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // 1. Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          max_lag_days: parseInt(maxLagDays),
          focus_area: focusArea || null,
          sector: selectedSector || null,
          notes: `Auto-created from suggestion${organization ? ` for ${organization}` : ''}`
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Add members to the group
      const memberships = members.map(member => ({
        contact_id: member.contactId,
        group_id: group.id,
        email_role: memberRoles[member.contactId]
      }));

      const { error: membershipError } = await supabase
        .from('contact_group_memberships')
        .insert(memberships);

      if (membershipError) throw membershipError;

      toast({
        title: "Group Created",
        description: `Successfully created "${groupName}" with ${members.length} members.`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Group Settings</DialogTitle>
          <DialogDescription>
            Set up the group details and assign email roles to each member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group Name */}
          <div>
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>

          {/* Max Lag Days */}
          <div>
            <Label htmlFor="maxLagDays">Max Lag Days *</Label>
            <Input
              id="maxLagDays"
              type="number"
              min="1"
              value={maxLagDays}
              onChange={(e) => setMaxLagDays(e.target.value)}
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum days between interactions before follow-up is needed
            </p>
          </div>

          {/* Focus Area */}
          <div>
            <Label htmlFor="focusArea">Focus Area</Label>
            <Select value={focusArea} onValueChange={setFocusArea}>
              <SelectTrigger id="focusArea">
                <SelectValue placeholder="Select focus area (optional)" />
              </SelectTrigger>
              <SelectContent>
                {focusAreas.map((fa) => (
                  <SelectItem key={fa} value={fa}>
                    {fa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sector */}
          <div>
            <Label htmlFor="sector">Sector</Label>
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger id="sector">
                <SelectValue placeholder="Select sector (optional)" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member Email Roles */}
          <div>
            <Label className="mb-3 block">Member Email Roles *</Label>
            <div className="space-y-2 border rounded-lg p-3 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <div key={member.contactId} className="flex items-center justify-between gap-4 p-2 border-b last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Select
                    value={memberRoles[member.contactId]}
                    onValueChange={(value: 'to' | 'cc' | 'bcc') =>
                      setMemberRoles({ ...memberRoles, [member.contactId]: value })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
