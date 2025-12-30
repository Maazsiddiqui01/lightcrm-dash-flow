import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Search, UserPlus, X } from 'lucide-react';
import { useDistinctFocusAreas } from '@/hooks/useDistinctFocusAreas';
import { useDistinctSectors } from '@/hooks/useDistinctSectors';
import { useSearchContactsExcludingIds } from '@/hooks/useSearchContactsExcludingIds';
import { Badge } from '@/components/ui/badge';

interface MemberData {
  contactId: string;
  email: string;
  name: string;
  isManuallyAdded?: boolean;
}

interface GroupConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;
  members: Array<{ contactId: string; email: string; name: string }>;
  sector?: string;
  focusArea?: string;
  organization?: string;
  suggestionId?: string;
  onGroupCreated?: (suggestionId: string, groupId: string) => void;
}

export function GroupConfigModal({
  open,
  onOpenChange,
  suggestedName,
  members,
  sector,
  focusArea: suggestedFocusArea,
  organization,
  suggestionId,
  onGroupCreated
}: GroupConfigModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  
  const [groupName, setGroupName] = useState(suggestedName);
  const [maxLagDays, setMaxLagDays] = useState<string>('30');
  const [focusArea, setFocusArea] = useState<string>(suggestedFocusArea || '');
  const [selectedSector, setSelectedSector] = useState<string>(sector || '');
  
  // All members including manually added ones
  const [allMembers, setAllMembers] = useState<MemberData[]>(
    members.map(m => ({ ...m, isManuallyAdded: false }))
  );
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(members.map(m => m.contactId))
  );
  const [memberRoles, setMemberRoles] = useState<Record<string, 'to' | 'cc' | 'bcc' | 'exclude'>>(
    Object.fromEntries(members.map(m => [m.contactId, 'to' as const]))
  );

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  const { data: focusAreas = [] } = useDistinctFocusAreas();
  const { data: sectors = [] } = useDistinctSectors();

  // Get IDs to exclude from search
  const excludeIds = useMemo(() => allMembers.map(m => m.contactId), [allMembers]);
  
  const { data: searchResults = [], isLoading: isSearching } = useSearchContactsExcludingIds(
    searchTerm,
    excludeIds,
    searchTerm.length >= 2
  );

  const handleAddContact = (contact: { id: string; full_name: string | null; email_address: string | null }, role: 'to' | 'cc' | 'bcc') => {
    const newMember: MemberData = {
      contactId: contact.id,
      email: contact.email_address || '',
      name: contact.full_name || contact.email_address || 'Unknown',
      isManuallyAdded: true
    };

    setAllMembers(prev => [...prev, newMember]);
    setSelectedMembers(prev => new Set([...prev, contact.id]));
    setMemberRoles(prev => ({ ...prev, [contact.id]: role }));
    setSearchTerm('');
  };

  const handleRemoveManualContact = (contactId: string) => {
    setAllMembers(prev => prev.filter(m => m.contactId !== contactId));
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      newSet.delete(contactId);
      return newSet;
    });
    setMemberRoles(prev => {
      const newRoles = { ...prev };
      delete newRoles[contactId];
      return newRoles;
    });
  };

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

    if (selectedMembers.size === 0) {
      toast({
        title: "Error",
        description: "At least one member must be selected",
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

      // 2. Add members to the group (only selected members)
      const memberships = Array.from(selectedMembers).map(contactId => ({
        contact_id: contactId,
        group_id: group.id,
        email_role: memberRoles[contactId]
      }));

      const { error: membershipError } = await supabase
        .from('contact_group_memberships')
        .insert(memberships);

      if (membershipError) throw membershipError;

      toast({
        title: "Group Created",
        description: `Successfully created "${groupName}" with ${selectedMembers.size} members.`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });

      // Notify parent that group was created
      if (onGroupCreated && suggestionId) {
        onGroupCreated(suggestionId, group.id);
      }

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
                  <SelectItem key={fa.value} value={fa.value}>
                    {fa.label}
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

          {/* Member Selection and Email Roles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Members ({selectedMembers.size} of {allMembers.length} selected)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedMembers.size === allMembers.length) {
                    setSelectedMembers(new Set());
                  } else {
                    setSelectedMembers(new Set(allMembers.map(m => m.contactId)));
                  }
                }}
              >
                {selectedMembers.size === allMembers.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="space-y-2 border rounded-lg p-3 max-h-64 overflow-y-auto">
              {allMembers.map((member) => (
                <div key={member.contactId} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                  <Checkbox
                    checked={selectedMembers.has(member.contactId)}
                    onCheckedChange={(checked) => {
                      const newSet = new Set(selectedMembers);
                      if (checked) {
                        newSet.add(member.contactId);
                      } else {
                        newSet.delete(member.contactId);
                      }
                      setSelectedMembers(newSet);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      {member.isManuallyAdded && (
                        <Badge variant="secondary" className="text-xs py-0 px-1.5">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Select
                    value={memberRoles[member.contactId]}
                    onValueChange={(value: 'to' | 'cc' | 'bcc' | 'exclude') =>
                      setMemberRoles({ ...memberRoles, [member.contactId]: value })
                    }
                    disabled={!selectedMembers.has(member.contactId)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to">To</SelectItem>
                      <SelectItem value="cc">CC</SelectItem>
                      <SelectItem value="bcc">BCC</SelectItem>
                      <SelectItem value="exclude">Exclude</SelectItem>
                    </SelectContent>
                  </Select>
                  {member.isManuallyAdded && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveManualContact(member.contactId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Uncheck members to exclude them from the group. "Exclude" role keeps members in the group but removes them from emails.
            </p>
          </div>

          {/* Add More Contacts Section */}
          <div className="border-t pt-4">
            <Label className="flex items-center gap-2 mb-3">
              <UserPlus className="h-4 w-4" />
              Add More Contacts
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or organization..."
                className="pl-9"
              />
            </div>
            
            {/* Search Results */}
            {searchTerm.length >= 2 && (
              <div className="mt-2 border rounded-lg overflow-hidden">
                {isSearching ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No contacts found matching "{searchTerm}"
                  </div>
                ) : (
                  <div className="divide-y max-h-48 overflow-y-auto">
                    {searchResults.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {contact.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.email_address}
                            {contact.organization && ` · ${contact.organization}`}
                          </p>
                        </div>
                        <Select
                          defaultValue="to"
                          onValueChange={(value: 'to' | 'cc' | 'bcc') => handleAddContact(contact, value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Add as..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="to">Add as To</SelectItem>
                            <SelectItem value="cc">Add as CC</SelectItem>
                            <SelectItem value="bcc">Add as BCC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
