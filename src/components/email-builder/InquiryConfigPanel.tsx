import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { TemplateSettings } from "@/types/phraseLibrary";

interface InquiryConfigPanelProps {
  settings: TemplateSettings;
  onSettingsChange: (settings: Partial<TemplateSettings>) => void;
}

export function InquiryConfigPanel({ settings, onSettingsChange }: InquiryConfigPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inquiry Configuration</CardTitle>
        <CardDescription>
          Every email must include ≥1 inquiry (question or question-equivalent statement)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Priority Order */}
        <div className="space-y-3">
          <Label>Inquiry Priority</Label>
          <div className="flex items-center gap-2">
            {settings.inquiry_config.priority.map((type, index) => (
              <Badge key={type} variant="secondary">
                {index + 1}. {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            The system will try to include inquiries in this priority order
          </p>
        </div>

        {/* Min/Max Inquiries */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Minimum Inquiries</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={settings.inquiry_config.min_inquiries}
              onChange={(e) => 
                onSettingsChange({
                  inquiry_config: {
                    ...settings.inquiry_config,
                    min_inquiries: Number(e.target.value),
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum Inquiries</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={settings.inquiry_config.max_inquiries}
              onChange={(e) => 
                onSettingsChange({
                  inquiry_config: {
                    ...settings.inquiry_config,
                    max_inquiries: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>

        {/* Inquiry Types Info */}
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">Inquiry Types</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong>Opportunity:</strong> Questions about specific logged opportunities</li>
            <li><strong>Article:</strong> Questions about shared articles</li>
            <li><strong>Focus Area:</strong> Questions about focus areas and sectors</li>
            <li><strong>Generic:</strong> General catch-up questions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}