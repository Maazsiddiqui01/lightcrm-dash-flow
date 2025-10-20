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
import { Mail, Users, Calendar, Target, ExternalLink, Clock, Edit, Save, X } from "lucide-react";
import { format } from "date-fns";
import type { GroupContactView } from "@/types/contact";
import { useToast } from "@/hooks/use-toast";
import { buildGroupEmailPayload } from "@/lib/groupEmailPayload";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface GroupContactDrawerProps {
  group: GroupContactView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function GroupContactDrawer({ group, open, onOpenChange, onUpdate }: GroupContactDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editedMaxLag, setEditedMaxLag] = useState<number | null>(null);
  const [editedRoles, setEditedRoles] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  if (!group) return null;

  const handleSaveEdits = async () => {
    setIsSaving(true);
    try {
      // Update max lag for all members if changed
      if (editedMaxLag !== null && editedMaxLag !== group.max_lag_days) {
        const { data: members, error: membersError } = await supabase
          .from('contacts_raw')
          .select('id')
          .eq('group_contact', group.group_name);

        if (membersError) throw membersError;

        if (members && members.length > 0) {
          const { error: updateError } = await supabase
            .from('contacts_raw')
            .update({ group_delta: editedMaxLag })
            .in('id', members.map(m => m.id));

          if (updateError) throw updateError;
        }
      }

      // Update individual member roles
      for (const [memberId, newRole] of Object.entries(editedRoles)) {
        const { error: roleError } = await supabase
          .from('contacts_raw')
          .update({ group_email_role: newRole })
          .eq('id', memberId);

        if (roleError) throw roleError;
      }

      toast({
        title: "Changes Saved",
        description: "Group settings updated successfully",
      });

      setEditMode(false);
      setEditedMaxLag(null);
      setEditedRoles({});
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
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
    setEditedRoles({});
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

  const toMembers = group.members.filter(m => m.group_email_role === 'to');
  const ccMembers = group.members.filter(m => m.group_email_role === 'cc');
  const bccMembers = group.members.filter(m => m.group_email_role === 'bcc');

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
                  <Button onClick={handleSendEmail} size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
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
              <Label className="text-muted-foreground">Next Outreach</Label>
              <div>
                {group.next_outreach_date ? (
                  <Badge variant={isOverdue ? "destructive" : "default"}>
                    {format(parseFlexibleDate(group.next_outreach_date)!, 'yyyy-MM-dd')}
                    {isOverdue && " (Overdue)"}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
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
                      key={member.id} 
                      member={member}
                      editMode={editMode}
                      editedRole={editedRoles[member.id]}
                      onRoleChange={(role) => setEditedRoles(prev => ({ ...prev, [member.id]: role }))}
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
                      key={member.id} 
                      member={member}
                      editMode={editMode}
                      editedRole={editedRoles[member.id]}
                      onRoleChange={(role) => setEditedRoles(prev => ({ ...prev, [member.id]: role }))}
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
                      key={member.id} 
                      member={member}
                      editMode={editMode}
                      editedRole={editedRoles[member.id]}
                      onRoleChange={(role) => setEditedRoles(prev => ({ ...prev, [member.id]: role }))}
                    />
                  ))}
                </div>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MemberCard({ member, editMode, editedRole, onRoleChange }: { 
  member: any; 
  editMode?: boolean;
  editedRole?: string;
  onRoleChange?: (role: string) => void;
}) {
  return (
    <div className="border rounded-lg p-3 space-y-1">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium">{member.full_name}</div>
          <div className="text-sm text-muted-foreground">{member.email_address}</div>
        </div>
        {editMode && onRoleChange ? (
          <Select 
            value={editedRole || member.group_email_role || 'to'} 
            onValueChange={onRoleChange}
          >
            <SelectTrigger className="w-20 h-8 ml-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="to">TO</SelectItem>
              <SelectItem value="cc">CC</SelectItem>
              <SelectItem value="bcc">BCC</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline" className="ml-2">
            {member.group_email_role?.toUpperCase()}
          </Badge>
        )}
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

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className || ''}`}>{children}</div>;
}
