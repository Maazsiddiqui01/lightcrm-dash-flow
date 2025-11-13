import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Users, Calendar, Target, ExternalLink, Clock, Edit, Save, X, Trash2, UserMinus, UserPlus } from "lucide-react";
import { format } from "date-fns";
import type { GroupContactView } from "@/types/contact";
import { useToast } from "@/hooks/use-toast";
import { buildGroupEmailPayload } from "@/lib/groupEmailPayload";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useGroupNotes } from "@/hooks/useGroupNotes";
import { GroupNotesSection } from "./GroupNotesSection";
import { useDeleteGroup } from "@/hooks/useDeleteGroup";
import { useRemoveContactFromGroup } from "@/hooks/useRemoveContactFromGroup";
import { Label } from "@/components/ui/label";
import { AddMemberToGroupModal } from "./AddMemberToGroupModal";
import { useSectors, useFocusAreas } from "@/hooks/useLookups";

interface GroupContactDrawerProps {
  group: GroupContactView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function GroupContactDrawer({ group, open, onOpenChange, onUpdate }: GroupContactDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteGroupMutation = useDeleteGroup();
  const removeContactMutation = useRemoveContactFromGroup();
  const [editMode, setEditMode] = useState(false);
  const [editedMaxLag, setEditedMaxLag] = useState<number | null>(null);
  const [editedGroupFocusArea, setEditedGroupFocusArea] = useState<string>('');
  const [editedGroupSector, setEditedGroupSector] = useState<string>('');
  const [editedRoles, setEditedRoles] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Fetch canonical lookup options
  const { data: sectorOptions = [] } = useSectors();
  const { data: focusAreaOptions = [] } = useFocusAreas();

  // Group notes hook - use group_id from the new schema
  const {
    currentNotes,
    timeline,
    isLoadingCurrent,
    isLoadingTimeline,
    saveNotes,
    isSavingNotes,
  } = useGroupNotes(group?.group_id);

  if (!group) return null;

  const handleSaveEdits = async () => {
    setIsSaving(true);
    try {
      // Prepare group-level updates
      const groupUpdates: any = {};
      let hasGroupUpdates = false;

      // Update max lag if changed
      if (editedMaxLag !== null && editedMaxLag !== group.max_lag_days) {
        groupUpdates.max_lag_days = editedMaxLag;
        hasGroupUpdates = true;
      }

      // Update group focus area if changed
      if (editedGroupFocusArea && editedGroupFocusArea !== (group.group_focus_area || '')) {
        groupUpdates.focus_area = editedGroupFocusArea;
        hasGroupUpdates = true;
      }

      // Update group sector if changed
      if (editedGroupSector && editedGroupSector !== (group.group_sector || '')) {
        groupUpdates.sector = editedGroupSector;
        hasGroupUpdates = true;
      }

      // Apply group-level updates if any
      if (hasGroupUpdates) {
        const { error: updateError } = await supabase
          .from('groups')
          .update({
            ...groupUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', group.group_id);

        if (updateError) throw updateError;
      }

      // Update individual member roles
      for (const [memberId, newRole] of Object.entries(editedRoles)) {
        const { error: roleError } = await supabase
          .from('contact_group_memberships')
          .update({ email_role: newRole })
          .eq('contact_id', memberId)
          .eq('group_id', group.group_id);

        if (roleError) throw roleError;
      }

      toast({
        title: "Changes Saved",
        description: "Group settings updated successfully",
      });

      setEditMode(false);
      setEditedMaxLag(null);
      setEditedGroupFocusArea('');
      setEditedGroupSector('');
      setEditedRoles({});
      
      // Invalidate all relevant queries for synchronization
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-members-new'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
      queryClient.invalidateQueries({ queryKey: ['all-contacts-view'] });
      onUpdate?.();
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

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedMaxLag(null);
    setEditedGroupFocusArea('');
    setEditedGroupSector('');
    setEditedRoles({});
  };

  const handleDeleteGroup = async () => {
    if (!confirm(`⚠️ Delete Group "${group.group_name}"?\n\nThis will:\n- Remove all ${group.member_count} members from the group\n- Clear group-related fields for all members\n- Cannot be undone\n\nContinue?`)) {
      return;
    }

    try {
      await deleteGroupMutation.mutateAsync(group.group_id);
      onOpenChange(false);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleSendEmail = async () => {
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

  const handleRemoveMember = async (contactId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this group?`)) {
      return;
    }

    try {
      await removeContactMutation.mutateAsync({
        contactId,
        groupId: group.group_id
      });
      
      toast({
        title: "Member Removed",
        description: `${memberName} has been removed from the group.`,
      });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const toMembers = group.members.filter(m => m.group_email_role === 'to');
  const ccMembers = group.members.filter(m => m.group_email_role === 'cc');
  const bccMembers = group.members.filter(m => m.group_email_role === 'bcc');
  const excludedMembers = group.members.filter(m => m.group_email_role === 'exclude');

  const isOverdue = group.next_outreach_date && new Date(group.next_outreach_date) < new Date();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl">{group.group_name}</SheetTitle>
              <SheetDescription>
                Group of {group.member_count} contact{group.member_count !== 1 ? 's' : ''}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdits} size="sm" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => setShowAddMemberModal(true)} variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                  <Button onClick={handleSendEmail} size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button 
                    onClick={handleDeleteGroup} 
                    variant="destructive" 
                    size="sm"
                    disabled={deleteGroupMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Group Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Max Lag Days</Label>
              <div>
                {editMode ? (
                  <Input
                    type="number"
                    value={editedMaxLag ?? group.max_lag_days ?? ''}
                    onChange={(e) => setEditedMaxLag(parseInt(e.target.value) || 0)}
                    className="w-32"
                    min="0"
                    max="365"
                  />
                ) : (
                  group.max_lag_days ? (
                    <Badge variant={group.max_lag_days > 90 ? "destructive" : "secondary"} className="text-base">
                      {group.max_lag_days} days
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Most Recent Contact</Label>
              <div className="flex items-center gap-2">
                {group.most_recent_contact ? (
                  <>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(parseFlexibleDate(group.most_recent_contact)!, 'yyyy-MM-dd')}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Never</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Group Focus Area</Label>
              <div>
                {editMode ? (
                  <Select 
                    value={editedGroupFocusArea || group.group_focus_area || ''} 
                    onValueChange={setEditedGroupFocusArea}
                  >
                    <SelectTrigger className="w-full">
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
                ) : (
                  group.group_focus_area ? (
                    <Badge variant="outline" className="text-base">
                      {group.group_focus_area}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Group Sector</Label>
              <div>
                {editMode ? (
                  <Select 
                    value={editedGroupSector || group.group_sector || ''} 
                    onValueChange={setEditedGroupSector}
                  >
                    <SelectTrigger className="w-full">
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
                ) : (
                  group.group_sector ? (
                    <Badge variant="outline" className="text-base">
                      {group.group_sector}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Last Updated</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(group.last_updated), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Members Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Members ({group.member_count})</h3>
            </div>

            {/* TO Members */}
            {toMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">To: ({toMembers.length})</Label>
                <div className="space-y-2">
                  {toMembers.map((member) => (
                    <MemberCard 
                      key={member.contact_id} 
                      member={member}
                      editMode={editMode}
                      editedRole={editedRoles[member.contact_id]}
                      onRoleChange={(role) => setEditedRoles(prev => ({ ...prev, [member.contact_id]: role }))}
                      onRemove={() => handleRemoveMember(member.contact_id, member.full_name)}
                      groupId={group.group_id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CC Members */}
            {ccMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">CC: ({ccMembers.length})</Label>
                <div className="space-y-2">
                  {ccMembers.map((member) => (
                    <MemberCard 
                      key={member.contact_id} 
                      member={member}
                      editMode={editMode}
                      editedRole={editedRoles[member.contact_id]}
                      onRoleChange={(role) => setEditedRoles(prev => ({ ...prev, [member.contact_id]: role }))}
                      onRemove={() => handleRemoveMember(member.contact_id, member.full_name)}
                      groupId={group.group_id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* BCC Members */}
            {bccMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">BCC: ({bccMembers.length})</Label>
                <div className="space-y-2">
                  {bccMembers.map((member) => (
                    <MemberCard 
                      key={member.contact_id} 
                      member={member}
                      editMode={editMode}
                      editedRole={editedRoles[member.contact_id]}
                      onRoleChange={(role) => setEditedRoles(prev => ({ ...prev, [member.contact_id]: role }))}
                      onRemove={() => handleRemoveMember(member.contact_id, member.full_name)}
                      groupId={group.group_id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Excluded Members */}
            {excludedMembers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">
                  Excluded from Emails: ({excludedMembers.length})
                </Label>
                <div className="space-y-2 opacity-60">
                  {excludedMembers.map((member) => (
                    <MemberCard 
                      key={member.contact_id} 
                      member={member}
                      editMode={editMode}
                      editedRole={editedRoles[member.contact_id]}
                      onRoleChange={(role) => setEditedRoles(prev => ({ ...prev, [member.contact_id]: role }))}
                      onRemove={() => handleRemoveMember(member.contact_id, member.full_name)}
                      isExcluded
                      groupId={group.group_id}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  These members are in the group but won't receive emails
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Opportunities Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Opportunities ({group.opportunity_count})</h3>
            </div>
            {group.opportunities ? (
              <div className="flex flex-wrap gap-2">
                {group.opportunities.split(',').map((opp, idx) => (
                  <Badge key={idx} variant="secondary">
                    {opp.trim()}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No opportunities</p>
            )}
          </div>

          {/* Focus Areas */}
          {group.all_focus_areas && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Focus Areas</Label>
                <div className="flex flex-wrap gap-2">
                  {group.all_focus_areas.split(',').map((fa, idx) => (
                    <Badge key={idx} variant="outline">
                      {fa.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Sectors */}
          {group.all_sectors && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Sectors</Label>
                <div className="flex flex-wrap gap-2">
                  {group.all_sectors.split(',').map((sector, idx) => (
                    <Badge key={idx} variant="outline">
                      {sector.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Group Notes Section */}
        <GroupNotesSection
          title="Group Notes"
          field="group_notes"
          currentValue={currentNotes?.notes || null}
            timeline={timeline}
            onSave={saveNotes}
            isLoadingCurrent={isLoadingCurrent}
            isLoadingTimeline={isLoadingTimeline}
            isSaving={isSavingNotes}
            showSharedIndicator={false}
          />
        </div>
      </SheetContent>

      {/* Add Member Modal */}
      <AddMemberToGroupModal
        groupId={group.group_id}
        groupName={group.group_name}
        open={showAddMemberModal}
        onOpenChange={setShowAddMemberModal}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
          queryClient.invalidateQueries({ queryKey: ['group-members-new', group.group_id] });
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
          queryClient.invalidateQueries({ queryKey: ['all-contacts-view'] });
          onUpdate?.();
        }}
      />
    </Sheet>
  );
}

function MemberCard({ member, editMode, editedRole, onRoleChange, onRemove, isExcluded, groupId }: { 
  member: any; 
  editMode?: boolean;
  editedRole?: string;
  onRoleChange?: (role: string) => void;
  onRemove?: () => void;
  isExcluded?: boolean;
  groupId?: string;
}) {
  return (
    <div className={`border rounded-lg p-3 space-y-1 ${isExcluded ? 'bg-muted/30' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium">{member.full_name}</div>
          <div className="text-sm text-muted-foreground">{member.email_address}</div>
        </div>
        <div className="flex items-center gap-2">
          {editMode && onRoleChange ? (
            <Select 
              value={editedRole || member.group_email_role || 'to'} 
              onValueChange={onRoleChange}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to">TO</SelectItem>
                <SelectItem value="cc">CC</SelectItem>
                <SelectItem value="bcc">BCC</SelectItem>
                <SelectItem value="exclude">Exclude</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline">
              {member.group_email_role?.toUpperCase() || 'TO'}
            </Badge>
          )}
          {!editMode && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 p-0"
              title="Remove from group"
            >
              <UserMinus className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {member.title && (
        <div className="text-sm text-muted-foreground">{member.title}</div>
      )}
      {member.organization && (
        <div className="text-sm text-muted-foreground">{member.organization}</div>
      )}
      {member.most_recent_contact && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Last contact: {format(parseFlexibleDate(member.most_recent_contact)!, 'yyyy-MM-dd')}
        </div>
      )}
    </div>
  );
}

