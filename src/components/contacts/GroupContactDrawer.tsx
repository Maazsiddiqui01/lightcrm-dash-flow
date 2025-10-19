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
import { Mail, Users, Calendar, Target, ExternalLink, Clock } from "lucide-react";
import { format } from "date-fns";
import type { GroupContactView } from "@/types/contact";
import { useToast } from "@/hooks/use-toast";

interface GroupContactDrawerProps {
  group: GroupContactView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function GroupContactDrawer({ group, open, onOpenChange, onUpdate }: GroupContactDrawerProps) {
  const { toast } = useToast();

  if (!group) return null;

  const handleSendEmail = () => {
    toast({
      title: "Email Builder",
      description: `Opening email builder for group: ${group.group_name}`,
    });
    // TODO: Navigate to email builder with group context
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
            <Button onClick={handleSendEmail} className="ml-4">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Group Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Max Lag Days</Label>
              <div>
                {group.max_lag_days ? (
                  <Badge variant={group.max_lag_days > 90 ? "destructive" : "secondary"} className="text-base">
                    {group.max_lag_days} days
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Most Recent Contact</Label>
              <div className="flex items-center gap-2">
                {group.most_recent_contact ? (
                  <>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(group.most_recent_contact), 'MMM dd, yyyy')}</span>
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
                    {format(new Date(group.next_outreach_date), 'MMM dd, yyyy')}
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
                    <MemberCard key={member.id} member={member} />
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
                    <MemberCard key={member.id} member={member} />
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
                    <MemberCard key={member.id} member={member} />
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

function MemberCard({ member }: { member: any }) {
  return (
    <div className="border rounded-lg p-3 space-y-1">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium">{member.full_name}</div>
          <div className="text-sm text-muted-foreground">{member.email_address}</div>
        </div>
        <Badge variant="outline" className="ml-2">
          {member.group_email_role?.toUpperCase()}
        </Badge>
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
          Last contact: {format(new Date(member.most_recent_contact), 'MMM dd, yyyy')}
        </div>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className || ''}`}>{children}</div>;
}
