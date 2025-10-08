import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings2, Info } from "lucide-react";
import { useMasterTemplates } from "@/hooks/useMasterTemplates";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailBuilderCoreSettingsProps {
  daysSinceContact: number;
  onDaysSinceContactChange: (days: number) => void;
  toneOverride: 'casual' | 'hybrid' | 'formal' | null;
  onToneOverrideChange: (tone: 'casual' | 'hybrid' | 'formal' | null) => void;
  lengthOverride: 'brief' | 'medium' | 'detailed' | null;
  onLengthOverrideChange: (length: 'brief' | 'medium' | 'detailed' | null) => void;
}

export function EmailBuilderCoreSettings({
  daysSinceContact,
  onDaysSinceContactChange,
  toneOverride,
  onToneOverrideChange,
  lengthOverride,
  onLengthOverrideChange,
}: EmailBuilderCoreSettingsProps) {
  const { data: masterTemplates } = useMasterTemplates();
  
  // Get the effective master template based on days
  const effectiveTemplate = masterTemplates?.find(t => 
    daysSinceContact >= t.days_min && 
    (t.days_max === null || daysSinceContact <= t.days_max)
  ) || masterTemplates?.[masterTemplates.length - 1];

  // Determine effective values (override or default)
  const effectiveTone = toneOverride || effectiveTemplate?.tone || 'hybrid';
  const effectiveLength = lengthOverride || effectiveTemplate?.length || 'standard';

  const getDaysRangeLabel = () => {
    if (!effectiveTemplate) return '';
    const max = effectiveTemplate.days_max === null ? '+' : `-${effectiveTemplate.days_max}`;
    return `${effectiveTemplate.days_min}${max} days`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Core Settings</CardTitle>
            <CardDescription>
              Configure email generation parameters
            </CardDescription>
          </div>
          {effectiveTemplate && (
            <Badge variant="outline" className="text-xs">
              {effectiveTemplate.master_key.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Days Since Most Recent Contact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="days-since-contact" className="text-sm font-medium">
              Days Since Most Recent Contact
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-xs">
                    Drives default tone, length, and subject style. Range: {getDaysRangeLabel()}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="days-since-contact"
            type="number"
            min={0}
            value={daysSinceContact}
            onChange={(e) => onDaysSinceContactChange(parseInt(e.target.value) || 0)}
            className="w-full"
          />
        </div>

        {/* Tone Override */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tone-override" className="text-sm font-medium">
              Tone
            </Label>
            <Badge variant="secondary" className="text-xs">
              Default: {effectiveTemplate?.tone || 'hybrid'}
            </Badge>
          </div>
          <Select
            value={toneOverride || 'default'}
            onValueChange={(val) => onToneOverrideChange(val === 'default' ? null : val as any)}
          >
            <SelectTrigger id="tone-override">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Use Default ({effectiveTemplate?.tone || 'hybrid'})</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="hybrid">Hybrid/Neutral</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Length Override */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="length-override" className="text-sm font-medium">
              Length
            </Label>
            <Badge variant="secondary" className="text-xs">
              Default: {effectiveTemplate?.length || 'medium'}
            </Badge>
          </div>
          <Select
            value={lengthOverride || 'default'}
            onValueChange={(val) => onLengthOverrideChange(val === 'default' ? null : val as any)}
          >
            <SelectTrigger id="length-override">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Use Default ({effectiveTemplate?.length || 'standard'})</SelectItem>
              <SelectItem value="brief">Brief</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>


        {/* Effective Settings Summary */}
        <div className="pt-3 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Effective Settings:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Tone: {effectiveTone}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Length: {effectiveLength}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Range: {getDaysRangeLabel()}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
