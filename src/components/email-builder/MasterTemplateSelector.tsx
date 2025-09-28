import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, HelpCircle } from "lucide-react";
import { useComposerRow } from "@/hooks/useComposer";
import { routeCase, routeMaster, daysSince, MASTER_TEMPLATES, CASE_LABELS, type MasterTemplate } from "@/lib/router";

interface MasterTemplateSelectorProps {
  selectedContactId: string | null;
  selectedContactEmail?: string | null;
  deltaType: 'Email' | 'Meeting';
  onDeltaTypeChange: (type: 'Email' | 'Meeting') => void;
}

export function MasterTemplateSelector({ 
  selectedContactId, 
  selectedContactEmail,
  deltaType, 
  onDeltaTypeChange 
}: MasterTemplateSelectorProps) {
  const { data: contactData } = useComposerRow(selectedContactEmail);
  const [selectedMaster, setSelectedMaster] = useState<MasterTemplate | null>(null);
  const [autoSelected, setAutoSelected] = useState(true);

  // Auto-select master template when contact loads
  useEffect(() => {
    if (contactData && autoSelected) {
      const masterConfig = routeMaster(contactData.most_recent_contact);
      setSelectedMaster(masterConfig);
    }
  }, [contactData, autoSelected]);

  // Reset when contact changes
  useEffect(() => {
    setAutoSelected(true);
    setSelectedMaster(null);
  }, [selectedContactId]);

  const handleMasterChange = (masterKey: string) => {
    const masterConfig = MASTER_TEMPLATES[masterKey];
    if (masterConfig) {
      setSelectedMaster({
        master_key: masterKey as MasterTemplate['master_key'],
        tone: masterKey === 'relationship_maintenance' ? 'casual' : 
              masterKey === 'hybrid_neutral' ? 'hybrid' : 'formal',
        subject_style: masterKey === 'relationship_maintenance' ? 'casual' : 
                      masterKey === 'hybrid_neutral' ? 'mixed' : 'formal'
      });
      setAutoSelected(false);
    }
  };

  const daysSinceContact = contactData ? daysSince(contactData.most_recent_contact) : null;
  const caseKey = contactData ? routeCase(contactData.gb_present, contactData.fa_count, contactData.has_opps) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Master Template (Auto)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Template Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">Master Template</h4>
            {daysSinceContact !== null && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Auto-selected based on {daysSinceContact} days since last contact</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Selected Master Display */}
          {selectedMaster && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {MASTER_TEMPLATES[selectedMaster.master_key]?.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tone: {selectedMaster.tone} • Subject: {selectedMaster.subject_style}
                  </div>
                </div>
                {autoSelected && (
                  <Badge variant="secondary" className="text-xs">
                    Auto
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Manual Master Selection */}
          <RadioGroup 
            value={selectedMaster?.master_key || ''} 
            onValueChange={handleMasterChange}
            className="space-y-3"
          >
            {Object.entries(MASTER_TEMPLATES).map(([key, config]) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem value={key} id={key} />
                <Label htmlFor={key} className="flex-1 cursor-pointer">
                  <div className="font-medium">{config.label}</div>
                  <div className="text-sm text-muted-foreground">{config.description}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Case Badge and Delta Type Row */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t">
          {/* Case Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Case:</span>
            {caseKey ? (
              <Badge variant="outline" className="font-mono">
                {caseKey.replace('case_', '')}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                N/A
              </Badge>
            )}
            {caseKey && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{CASE_LABELS[caseKey]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Delta Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Type:</span>
            <Select value={deltaType} onValueChange={(value: 'Email' | 'Meeting') => onDeltaTypeChange(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && contactData && (
          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
            GB: {contactData.gb_present ? 'Yes' : 'No'} • 
            FA Count: {contactData.fa_count} • 
            Has Opps: {contactData.has_opps ? 'Yes' : 'No'} • 
            Days: {daysSinceContact}
          </div>
        )}
      </CardContent>
    </Card>
  );
}