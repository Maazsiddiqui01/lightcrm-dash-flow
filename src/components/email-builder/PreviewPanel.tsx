import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Edit, Users, Mail } from 'lucide-react';
import type { EffectiveConfig } from '@/types/groupEmailBuilder';

interface PreviewPanelProps {
  config: EffectiveConfig | null;
  contactName: string;
  onEdit: () => void;
}

const MODULE_LABELS: Record<string, string> = {
  initial_greeting: "Initial Greeting",
  self_personalization: "Self Personalization",
  top_opportunities: "Top Opportunities",
  article_recommendations: "Article Recommendations",
  platforms: "Platforms",
  addons: "Add-ons",
  suggested_talking_points: "Suggested Talking Points",
  general_org_update: "General Org Update",
  attachments: "Attachments",
  meeting_request: "Meeting Request",
  ai_backup_personalization: "AI Backup Personalization",
};

const MODE_COLORS: Record<string, string> = {
  never: 'text-muted-foreground bg-muted',
  sometimes: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30',
  always: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  return (
    <Badge variant="outline" className={`text-xs ${MODE_COLORS[mode] || MODE_COLORS.never}`}>
      {mode}
    </Badge>
  );
}

export function PreviewPanel({ config, contactName, onEdit }: PreviewPanelProps) {
  if (!config) {
    return (
      <Card className="sticky top-6 h-fit">
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select a contact to preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-6 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto" aria-label="Contact preview">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Preview: {contactName}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1">
            <Edit className="h-3 w-3" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Master Template */}
        <Section title="Master Template">
          <Badge variant="secondary">{config.masterTemplate.master_key.replace(/_/g, ' ')}</Badge>
          <KeyValue label="Days Since Contact" value={config.coreSettings.daysSince} />
        </Section>

        {/* Core Settings */}
        <Section title="Core Settings">
          <KeyValue label="Tone" value={config.coreSettings.tone} />
          <KeyValue label="Length" value={config.coreSettings.length} />
        </Section>

        {/* Subject Line Pool */}
        <Section title="Subject Line Pool">
          <div className="flex flex-wrap gap-1">
            {config.subjectLinePool.selectedIds.length > 0 ? (
              <>
                <Badge variant="outline" className="text-xs">
                  {config.subjectLinePool.selectedIds.length} selected
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {config.subjectLinePool.style}
                </Badge>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">None selected</span>
            )}
          </div>
        </Section>

        {/* Email Modules */}
        <Section title="Email Modules">
          <ol className="space-y-1.5">
            {config.moduleOrder.map((module, idx) => {
              const moduleState = config.moduleStates[module] || 'never';
              return (
                <li key={module} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-4">{idx + 1}.</span>
                  <span className="flex-1 truncate">{MODULE_LABELS[module] || module}</span>
                  <ModeBadge mode={moduleState} />
                </li>
              );
            })}
          </ol>
        </Section>

        {/* Contact Information */}
        <Section title="Contact Information">
          <KeyValue label="Organization" value={config.contactInfo.organization || 'N/A'} />
          <div>
            <Label className="text-xs text-muted-foreground">Focus Areas</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {config.contactInfo.focusAreas.length > 0 ? (
                config.contactInfo.focusAreas.slice(0, 3).map((fa, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {fa}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
              {config.contactInfo.focusAreas.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{config.contactInfo.focusAreas.length - 3} more
                </Badge>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Team
            </Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {config.team.length > 0 ? (
                config.team.map((member) => (
                  <Badge key={member.id} variant="secondary" className="text-xs">
                    {member.name}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </Section>

        {/* Recipients */}
        <Section title="Recipients">
          <KeyValue label="TO" value={config.recipients.to} />
          <div>
            <Label className="text-xs text-muted-foreground">CC</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {config.recipients.cc.length > 0 ? (
                config.recipients.cc.map((email, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {email}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </Section>
      </CardContent>

      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="preview-announcer"
      />
    </Card>
  );
}
