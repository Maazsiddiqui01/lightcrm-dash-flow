import { useContactEnriched } from "@/hooks/useContactEnriched";
import { useContactGroupInfo } from "@/hooks/useContactGroupInfo";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { GroupMembersBadge } from "@/components/email-builder/GroupMembersBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EditableTeam, type TeamMember } from "./EditableTeam";
import { 
  Info, 
  Building, 
  Mail, 
  Users, 
  Target, 
  Calendar,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface ContactInfoPanelProps {
  contactId: string;
  team: TeamMember[];
  onTeamChange: (members: TeamMember[]) => void;
  onQuickAddToCC?: (member: TeamMember) => void;
}

export function ContactInfoPanel({ contactId, team, onTeamChange, onQuickAddToCC }: ContactInfoPanelProps) {
  const { data: enrichedData, isLoading } = useContactEnriched(contactId);
  const { data: groupInfo } = useContactGroupInfo(contactId);
  const { data: groupMembers } = useGroupMembers(groupInfo?.group_contact);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!enrichedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Contact information not available</p>
        </CardContent>
      </Card>
    );
  }

  const { contact, focusAreas, opps, focusMeta, mostRecentContact, OutreachDate } = enrichedData;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{contact.organization || "No organization"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{contact.email}</span>
          </div>
        </div>

        <Separator />

        {/* Group Contact */}
        {groupInfo?.group_contact && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Group Contact</span>
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="text-sm">
                {groupInfo.group_contact}
              </Badge>
              <GroupMembersBadge groupName={groupInfo.group_contact} compact />
              {groupMembers?.all && groupMembers.all.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Members: {groupMembers.all.map(m => m.full_name || m.email_address).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Focus Areas */}
        {focusAreas && focusAreas.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Focus Areas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusAreas.map((area) => (
                <Badge key={area} variant="secondary">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities - Show All (HIGH-4 fix) */}
        {opps && opps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Active Tier 1 Opportunities</span>
              <Badge variant="secondary" className="text-xs">
                {opps.length}
              </Badge>
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {opps.map((opp, index) => (
                <div key={index} className="text-sm bg-muted/50 px-2 py-1 rounded">
                  {opp.deal_name}
                  {opp.ebitda_in_ms && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ${opp.ebitda_in_ms}M
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Team</span>
          </div>
          <EditableTeam
            members={team}
            onMembersChange={onTeamChange}
            onQuickAddToCC={onQuickAddToCC}
            contactEmail={contact.email || ''}
          />
        </div>

        <Separator />

        {/* Contact Timeline */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Timeline</span>
          </div>
          <div className="text-sm space-y-1">
            {mostRecentContact && mostRecentContact !== "0" && (
              <div>
                <span className="text-muted-foreground">Last Contact: </span>
                <span>{format(new Date(mostRecentContact), "MMM dd, yyyy")}</span>
              </div>
            )}
            {OutreachDate && (
              <div>
                <span className="text-muted-foreground">Next Outreach: </span>
                <span>{format(new Date(OutreachDate), "MMM dd, yyyy")}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}