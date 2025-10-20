import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Users } from "lucide-react";
import { buildCc } from "@/lib/buildCc";
import type { ContactEmailComposer } from "@/types/emailComposer";
import { useContactGroups } from "@/hooks/useContactGroups";
import { useGroupMembersNew } from "@/hooks/useGroupMembersNew";

interface CCPreviewCardProps {
  contactData: ContactEmailComposer | null;
  deltaType: 'Email' | 'Meeting';
}

export function CCPreviewCard({ contactData, deltaType }: CCPreviewCardProps) {
  // Get all groups this contact belongs to
  const { data: contactGroups } = useContactGroups(contactData?.contact_id || null);
  
  // Get members from all groups
  const firstGroupId = contactGroups?.[0]?.group_id;
  const { data: groupMembers } = useGroupMembersNew(firstGroupId || null);

  if (!contactData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Recipients Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a contact to preview recipients</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build CC list from leads/assistants
  const baseCcList = buildCc(
    contactData.email_cc,
    contactData.lead_emails,
    contactData.assistant_emails,
    deltaType,
    contactData.email
  );

  const baseCcEmails = baseCcList ? baseCcList.split(';').map(e => e.trim()).filter(e => e) : [];

  // Add group CC members if they exist
  const groupCcEmails = groupMembers?.filter(m => m.email_role === 'cc').map(m => m.email_address) || [];
  const allCcEmails = [...baseCcEmails, ...groupCcEmails].filter((e, i, arr) => arr.indexOf(e) === i);

  // Get group BCC members
  const groupBccEmails = groupMembers?.filter(m => m.email_role === 'bcc').map(m => m.email_address) || [];

  // Determine primary TO recipient(s)
  const groupToMembers = groupMembers?.filter(m => m.email_role === 'to') || [];
  const toEmails = groupToMembers.length > 0
    ? groupToMembers.map(m => m.email_address)
    : [contactData.email];

  const isGroupEmail = contactGroups && contactGroups.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Recipients Preview
          {isGroupEmail && contactGroups && (
            <Badge variant="secondary" className="text-xs ml-2">
              Group: {contactGroups[0].group_name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* To Address */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="text-xs">TO</Badge>
            <span className="text-sm font-medium">
              Primary Recipient{toEmails.length > 1 ? 's' : ''}
              {isGroupEmail ? ' (Group)' : ''}
            </span>
          </div>
          <div className="p-2 bg-muted rounded text-sm">
            {toEmails.map((email, i) => (
              <div key={i}>
                {email}
                {groupToMembers[i] && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({groupToMembers[i].full_name})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CC Addresses */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">CC</Badge>
            <span className="text-sm font-medium">
              Carbon Copy ({allCcEmails.length})
            </span>
            <Badge variant="secondary" className="text-xs">
              {deltaType}
            </Badge>
            {groupCcEmails.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{groupCcEmails.length} from group
              </Badge>
            )}
          </div>
          
          {allCcEmails.length > 0 ? (
            <div className="p-2 bg-muted rounded text-sm">
              {allCcEmails.join('; ')}
            </div>
          ) : (
            <div className="p-2 bg-muted rounded text-sm text-muted-foreground">
              No CC recipients
            </div>
          )}
        </div>

        {/* BCC Addresses (Group Only) */}
        {groupBccEmails.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">BCC</Badge>
              <span className="text-sm font-medium">
                Blind Carbon Copy ({groupBccEmails.length})
              </span>
              <Badge variant="secondary" className="text-xs">
                Hidden from other recipients
              </Badge>
            </div>
            <div className="p-2 bg-muted rounded text-sm">
              {groupBccEmails.join('; ')}
            </div>
          </div>
        )}

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground p-2 bg-yellow-50 rounded">
            <strong>Debug CC Build:</strong><br />
            Email CC: {contactData.email_cc || 'None'}<br />
            Leads: [{contactData.lead_emails.join(', ') || 'None'}]<br />
            Assistants: [{contactData.assistant_emails.join(', ') || 'None'}]<br />
            Delta: {deltaType}<br />
            Excluded (TO): {contactData.email}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
