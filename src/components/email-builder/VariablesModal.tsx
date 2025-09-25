import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Variables {
  focusAreas: string[];
  gbPresent: boolean;
  faCount: number;
  hasOpps: boolean;
  deltaType: string;
  hsPresent: boolean;
  lsPresent: boolean;
  subjectMode: string;
  maxOpps: number;
  extraCC: string;
  customInstructions: string;
  customPosition: string;
}

interface VariablesModalProps {
  open: boolean;
  onClose: () => void;
  variables: Variables;
  onVariablesChange: (variables: Variables) => void;
  derivedVariables: Variables;
}

export function VariablesModal({ 
  open, 
  onClose, 
  variables, 
  onVariablesChange,
  derivedVariables 
}: VariablesModalProps) {
  const updateVariable = (key: keyof Variables, value: any) => {
    onVariablesChange({
      ...variables,
      [key]: value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adjust Variables</DialogTitle>
          <DialogDescription>
            Customize the variables for email generation. Derived values are shown as defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Focus Areas & General BD</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="focus-areas">Focus Areas (Multi-select)</Label>
                <div className="text-sm text-muted-foreground">
                  Derived: {derivedVariables.focusAreas.join(', ') || 'None'}
                </div>
                {/* TODO: Implement multi-select component */}
                <div className="text-xs text-muted-foreground">
                  Multi-select component to be implemented
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="gb-present">General BD Toggle</Label>
                <Switch
                  id="gb-present"
                  checked={variables.gbPresent}
                  onCheckedChange={(checked) => updateVariable('gbPresent', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>FA Count (readonly)</Label>
                <Input
                  value={variables.faCount}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opportunities & Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="has-opps">Has Opportunities Toggle</Label>
                <Switch
                  id="has-opps"
                  checked={variables.hasOpps}
                  onCheckedChange={(checked) => updateVariable('hasOpps', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delta-type">Delta Type</Label>
                <Select
                  value={variables.deltaType}
                  onValueChange={(value) => updateVariable('deltaType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hs-present">HS Present</Label>
                  <Switch
                    id="hs-present"
                    checked={variables.hsPresent}
                    onCheckedChange={(checked) => updateVariable('hsPresent', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ls-present">LS Present</Label>
                  <Switch
                    id="ls-present"
                    checked={variables.lsPresent}
                    onCheckedChange={(checked) => updateVariable('lsPresent', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Mode</Label>
                <RadioGroup
                  value={variables.subjectMode}
                  onValueChange={(value) => updateVariable('subjectMode', value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lg_first" id="lg_first_var" />
                    <Label htmlFor="lg_first_var">LG First</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fa_first" id="fa_first_var" />
                    <Label htmlFor="fa_first_var">FA First</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-opps">Max Opportunities</Label>
                <Input
                  id="max-opps"
                  type="number"
                  min="1"
                  max="10"
                  value={variables.maxOpps}
                  onChange={(e) => updateVariable('maxOpps', parseInt(e.target.value) || 3)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="extra-cc">Extra CC (free text)</Label>
                <Input
                  id="extra-cc"
                  value={variables.extraCC}
                  onChange={(e) => updateVariable('extraCC', e.target.value)}
                  placeholder="Additional CC emails (comma-separated)"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-instructions">Custom Instructions</Label>
                <Textarea
                  id="custom-instructions"
                  value={variables.customInstructions}
                  onChange={(e) => updateVariable('customInstructions', e.target.value)}
                  placeholder="Additional instructions for email generation"
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Position</Label>
                <RadioGroup
                  value={variables.customPosition}
                  onValueChange={(value) => updateVariable('customPosition', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intro" id="intro_var" />
                    <Label htmlFor="intro_var">Intro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after_bullets" id="after_bullets_var" />
                    <Label htmlFor="after_bullets_var">After Bullets</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="before_closing" id="before_closing_var" />
                    <Label htmlFor="before_closing_var">Before Closing</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}