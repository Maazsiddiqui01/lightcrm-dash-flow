import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Building, Mail, FileText, ExternalLink, Calendar } from "lucide-react";
import { EnrichedContact } from "@/hooks/useContactEnriched";
import { format } from "date-fns";

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

        {contact.focusAreaDescriptions.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Focus Area Details:
            </div>
            <div className="space-y-2">
              {contact.focusAreaDescriptions.map((desc, index) => (
                <div key={index} className="p-2 bg-muted rounded-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{desc.focus_area}</span>
                    <Badge variant="outline" className="text-xs">
                      {desc.platform_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{desc.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {contact.articles && contact.articles.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Relevant Articles:
            </div>
            <div className="space-y-2">
              {contact.articles.map((article, index) => (
                <div key={index} className="p-2 bg-muted rounded-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Badge variant="outline" className="text-xs mb-1">
                        {article.focus_area}
                      </Badge>
                      <a
                        href={article.article_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        View Article
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-col items-end gap-1">
                      {article.article_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(article.article_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                      {article.last_date_to_use && (
                        <div className="text-destructive text-xs">
                          Use by: {format(new Date(article.last_date_to_use), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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