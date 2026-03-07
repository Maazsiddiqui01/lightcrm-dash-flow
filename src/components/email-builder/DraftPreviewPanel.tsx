import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { callN8nProxy } from '@/lib/n8nProxy';
import { EmailTemplate } from "@/hooks/useEmailTemplates";
import { ResolvedTemplate } from "@/hooks/useResolvedTemplate";
import type { EmailBuilderPayload } from "@/hooks/useEmailBuilderData";

interface DraftPreviewPanelProps {
  contact: any;
  resolved: ResolvedTemplate | null;
  payload: EmailBuilderPayload | null;
  template: EmailTemplate | null;
  isLoading?: boolean;
}

interface DraftResponse {
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  send?: boolean;
  skip_reason?: string;
}

export function DraftPreviewPanel({ contact, resolved, payload, template, isLoading }: DraftPreviewPanelProps) {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResponse, setDraftResponse] = useState<DraftResponse | null>(null);
  const { toast } = useToast();

  const generatePreviewBody = () => {
    if (!resolved || !contact || !payload) return "";

    const lines: string[] = [];
    
    // Greeting
    lines.push(resolved.chosen_greeting);
    
    // Article link if available
    if (resolved.article_hint?.link && resolved.included_modules.includes('Article Recommendations')) {
      lines.push("");
      lines.push(`I came across this article and thought to share it with you: ${resolved.article_hint.link}`);
    }
    
    lines.push("");
    
    // Focus area descriptions (verbatim)
    if (resolved.fa_defaults.length > 0) {
      resolved.fa_defaults.forEach(fa => {
        lines.push(fa.text_value);
      });
      lines.push("");
    }
    
    // Platforms if included
    if (resolved.included_modules.includes('Platforms') && resolved.fa_platforms.length > 0) {
      lines.push("Platform opportunities:");
      resolved.fa_platforms.forEach(fa => {
        lines.push(`• ${fa.text_value}`);
      });
      lines.push("");
    }
    
    // Add-ons if included
    if (resolved.included_modules.includes('Add-ons') && resolved.fa_addons.length > 0) {
      lines.push("Add-on opportunities:");
      resolved.fa_addons.forEach(fa => {
        lines.push(`• ${fa.text_value}`);
      });
      lines.push("");
    }
    
    // Top opportunities question (preferred)
    if (resolved.included_modules.includes('Top Opportunities') && (payload.opps?.length || 0) > 0) {
      lines.push("Are any of these current opportunities of interest to you?");
      lines.push("");
    }
    // Article question (fallback)
    else if (resolved.included_modules.includes('Article Recommendations') && resolved.article_hint) {
      lines.push("What are your thoughts on this development?");
      lines.push("");
    }
    // FA question (final fallback)
    else if (payload.focusAreas.length > 0) {
      lines.push(`Any interesting developments in ${payload.focusAreas.join(' or ')}?`);
      lines.push("");
    }
    
    // Meeting request
    const meetingLine = template?.delta_type === 'Meeting' 
      ? `${resolved.chosen_meeting_req} ${payload.assistantNames.length > 0 ? `${payload.assistantNames.join(' and ')} (copied) can help coordinate.` : ''}`
      : resolved.chosen_meeting_req;
    
    lines.push(meetingLine);
    lines.push("");
    lines.push("Regards,");
    lines.push("Tom");
    
    return lines.join('\n');
  };

  const generateDraft = async () => {
    if (!contact || !resolved || !payload || !template) return;
    
    setIsDrafting(true);
    
    try {
      const postPayload = {
        contact: {
          firstName: contact.first_name,
          email: contact.email_address,
          organization: contact.organization,
          lgEmailsCc: contact.email_cc || "",
          fullName: contact.full_name
        },
        focusAreas: payload.focusAreas,
        focusAreaDescriptions: payload.focusAreaDescriptions,
        opps: payload.opps || [],
        assistantNames: payload.assistantNames,
        delta_type: template.delta_type || "Email",
        mostRecentContact: contact.most_recent_contact || new Date().toISOString().split('T')[0],
        OutreachDate: contact.outreach_date || new Date().toISOString().split('T')[0],
        template: template,
        articles: payload.articles,
        resolved: resolved
      };
      
      console.log('Sending payload to n8n:', postPayload);
      
      // POST to n8n via authenticated proxy
      const response = await callN8nProxy('email-builder', postPayload);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setDraftResponse(result);
      
      // Store in local history
      const history = JSON.parse(localStorage.getItem('email-draft-history') || '[]');
      history.unshift({
        timestamp: new Date().toISOString(),
        contact: contact.full_name,
        template: template.name,
        response: result
      });
      // Keep only last 10 entries
      localStorage.setItem('email-draft-history', JSON.stringify(history.slice(0, 10)));
      
      toast({
        title: "Draft Generated",
        description: result.send ? "Email draft created successfully" : `Skipped: ${result.skip_reason}`,
      });
      
    } catch (error) {
      console.error('Draft generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate draft",
        variant: "destructive",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const copyToClipboard = async () => {
    const previewText = generatePreviewBody();
    if (!previewText) return;
    
    try {
      await navigator.clipboard.writeText(previewText);
      toast({
        title: "Copied",
        description: "Preview content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const copyResponseToClipboard = async () => {
    if (!draftResponse) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(draftResponse, null, 2));
      toast({
        title: "Copied",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy response",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Email Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!contact || !resolved || !payload) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Email Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Select a contact and template to see preview
          </p>
        </CardContent>
      </Card>
    );
  }

  const previewBody = generatePreviewBody();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Email Preview</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                onClick={generateDraft} 
                disabled={isDrafting}
              >
                {isDrafting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Generate Draft
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">To:</div>
            <div className="text-sm">{contact.email_address}</div>
          </div>
          
          {contact.email_cc && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">CC:</div>
              <div className="text-sm">{contact.email_cc}</div>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Subject:</div>
            <div className="text-sm font-medium">{resolved.chosen_subject}</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Body:</div>
            <Textarea
              value={previewBody}
              readOnly
              className="min-h-[300px] font-mono text-xs resize-none"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Tone: {resolved.tone}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Length: {resolved.length}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Modules: {resolved.included_modules.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {draftResponse && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Generated Draft Response</CardTitle>
              <Button variant="outline" size="sm" onClick={copyResponseToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {draftResponse.send ? (
                <Badge className="bg-green-100 text-green-800">Ready to Send</Badge>
              ) : (
                <div className="space-y-2">
                  <Badge variant="destructive">Skipped</Badge>
                  {draftResponse.skip_reason && (
                    <div className="text-sm text-muted-foreground">
                      Reason: {draftResponse.skip_reason}
                    </div>
                  )}
                </div>
              )}
              
              <Textarea
                value={JSON.stringify(draftResponse, null, 2)}
                readOnly
                className="min-h-[200px] font-mono text-xs resize-none"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
