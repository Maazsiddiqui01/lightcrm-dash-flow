import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Users } from "lucide-react";
import { buildCc } from "@/lib/buildCc";
import type { ContactEmailComposer } from "@/types/emailComposer";

interface CCPreviewCardProps {
  contactData: ContactEmailComposer | null;
  deltaType: 'Email' | 'Meeting';
}

export function CCPreviewCard({ contactData, deltaType }: CCPreviewCardProps) {
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

  const ccList = buildCc(
    contactData.lg_emails_cc,
    contactData.lead_emails,
    contactData.assistant_emails,
    deltaType,
    contactData.email
  );

  const ccEmails = ccList ? ccList.split(';').map(e => e.trim()).filter(e => e) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Recipients Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* To Address */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="default" className="text-xs">TO</Badge>
            <span className="text-sm font-medium">Primary Recipient</span>
          </div>
          <div className="p-2 bg-muted rounded text-sm">
            {contactData.email}
          </div>
        </div>

        {/* CC Addresses */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">CC</Badge>
            <span className="text-sm font-medium">
              Carbon Copy ({ccEmails.length})
            </span>
            <Badge variant="secondary" className="text-xs">
              {deltaType}
            </Badge>
          </div>
          
          {ccEmails.length > 0 ? (
            <div className="p-2 bg-muted rounded text-sm">
              {ccEmails.join('; ')}
            </div>
          ) : (
            <div className="p-2 bg-muted rounded text-sm text-muted-foreground">
              No CC recipients
            </div>
          )}
        </div>

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground p-2 bg-yellow-50 rounded">
            <strong>Debug CC Build:</strong><br />
            LG CC: {contactData.lg_emails_cc || 'None'}<br />
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