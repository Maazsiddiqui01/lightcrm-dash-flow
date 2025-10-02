import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings2, Info } from "lucide-react";
import { useMasterTemplates } from "@/hooks/useMasterTemplates";
import { useSubjectLibrary } from "@/hooks/useSubjectLibrary";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailBuilderCoreSettingsProps {
  daysSinceContact: number;
  onDaysSinceContactChange: (days: number) => void;
  toneOverride: 'casual' | 'hybrid' | 'formal' | null;
  onToneOverrideChange: (tone: 'casual' | 'hybrid' | 'formal' | null) => void;
  lengthOverride: 'brief' | 'medium' | 'detailed' | null;
  onLengthOverrideChange: (length: 'brief' | 'medium' | 'detailed' | null) => void;
  subjectPoolOverride: string[];
  onSubjectPoolOverrideChange: (subjects: string[]) => void;
}

export function EmailBuilderCoreSettings({
  daysSinceContact,
  onDaysSinceContactChange,
  toneOverride,
  onToneOverrideChange,
  lengthOverride,
  onLengthOverrideChange,
  subjectPoolOverride,
  onSubjectPoolOverrideChange,
}: EmailBuilderCoreSettingsProps) {
  const { data: masterTemplates } = useMasterTemplates();
  const { data: allSubjects } = useSubjectLibrary();
  
  // Get the effective master template based on days
  const effectiveTemplate = masterTemplates?.find(t => 
    daysSinceContact >= t.days_min && 
    (t.days_max === null || daysSinceContact <= t.days_max)
  ) || masterTemplates?.[masterTemplates.length - 1];

  // Determine effective values (override or default)
  const effectiveTone = toneOverride || effectiveTemplate?.tone || 'hybrid';
  const effectiveLength = lengthOverride || effectiveTemplate?.length || 'medium';
  const effectiveSubjectStyle = effectiveTemplate?.subject_style || 'mixed';

  // Filter subjects by effective style
  const availableSubjects = allSubjects?.filter(s => {
    if (effectiveSubjectStyle === 'mixed') return true;
    return s.style === effectiveSubjectStyle;
  }) || [];

  const handleSubjectToggle = (subjectId: string) => {
    if (subjectPoolOverride.includes(subjectId)) {
      onSubjectPoolOverrideChange(subjectPoolOverride.filter(id => id !== subjectId));
    } else {
      onSubjectPoolOverrideChange([...subjectPoolOverride, subjectId]);
    }
  };

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
              <SelectItem value="default">Use Default ({effectiveTemplate?.length || 'medium'})</SelectItem>
              <SelectItem value="brief">Brief</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subject Pool Override */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Subject Line Pool
            </Label>
            <Badge variant="secondary" className="text-xs">
              Style: {effectiveSubjectStyle}
            </Badge>
          </div>
          <ScrollArea className="h-[200px] rounded-md border p-3">
            <div className="space-y-3">
              {availableSubjects.map((subject) => (
                <div key={subject.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`subject-${subject.id}`}
                    checked={subjectPoolOverride.length === 0 || subjectPoolOverride.includes(subject.id)}
                    onCheckedChange={() => handleSubjectToggle(subject.id)}
                  />
                  <div className="flex-1 space-y-1">
                    <label
                      htmlFor={`subject-${subject.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {subject.subject_template}
                    </label>
                    <Badge variant="outline" className="text-xs ml-2">
                      {subject.style}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground">
            {subjectPoolOverride.length === 0 
              ? `All ${availableSubjects.length} subjects enabled`
              : `${subjectPoolOverride.length} of ${availableSubjects.length} subjects selected`
            }
          </p>
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
