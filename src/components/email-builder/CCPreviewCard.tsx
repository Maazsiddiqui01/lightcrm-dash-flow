import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { EnrichedContact } from "@/hooks/useContactEnriched";

interface CCPreviewCardProps {
  contact: EnrichedContact;
  extraCC: string;
}

export function CCPreviewCard({ contact, extraCC }: CCPreviewCardProps) {
  // Helper function to deduplicate CC emails
  const getDeduplicatedCCs = () => {
    const ccEmails = new Set<string>();
    
    // Add from contact's LG emails
    if (contact.contact.lgEmailsCc) {
      contact.contact.lgEmailsCc.split(',').forEach(email => {
        const trimmed = email.trim();
        if (trimmed) ccEmails.add(trimmed);
      });
    }

    // Add from focus meta (leads and assistants)
    contact.focusMeta.forEach(meta => {
      if (meta.lead1_email) ccEmails.add(meta.lead1_email);
      if (meta.lead2_email) ccEmails.add(meta.lead2_email);
      if (meta.assistant_email) ccEmails.add(meta.assistant_email);
    });

    // Add extra CC emails
    if (extraCC) {
      extraCC.split(',').forEach(email => {
        const trimmed = email.trim();
        if (trimmed) ccEmails.add(trimmed);
      });
    }

    return Array.from(ccEmails);
  };

  const ccList = getDeduplicatedCCs();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          CC Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ccList.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {ccList.length} recipient{ccList.length !== 1 ? 's' : ''}:
            </div>
            <div className="space-y-1">
              {ccList.map((email, index) => (
                <div key={index} className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {email}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No CC recipients
          </div>
        )}
      </CardContent>
    </Card>
  );
}