import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Building, Mail } from "lucide-react";
import { EnrichedContact } from "@/hooks/useContactEnriched";

interface ContactSummaryCardProps {
  contact: EnrichedContact;
}

export function ContactSummaryCard({ contact }: ContactSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Contact Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{contact.contact.fullName}</span>
          </div>
          
          {contact.contact.organization && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{contact.contact.organization}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{contact.contact.email}</span>
          </div>
        </div>

        {contact.focusAreas.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Focus Areas:</div>
            <div className="flex flex-wrap gap-1">
              {contact.focusAreas.map((area, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Badge variant={contact.delta_type === 'Meeting' ? 'default' : 'outline'}>
            {contact.delta_type}
          </Badge>
          {contact.has_opps && (
            <Badge variant="secondary">
              Has Opportunities
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}