import { useMemo } from "react";
import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Building2 } from "lucide-react";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";
import { hasInsuranceServicesFocusArea, INSURANCE_SERVICES_PHRASES } from "@/utils/focusAreaDetection";
import { cn } from "@/lib/utils";

interface TalkingPointsSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    firstName?: string;
    focusAreas?: string[];
  };
  contactName?: string;
  defaultPhraseId?: string;
  onDefaultToggle?: (phraseId: string | null) => void;
}

export function TalkingPointsSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
}: TalkingPointsSelectorProps) {
  const previewVariables = {
    first_name: contactData?.firstName || 'John',
  };

  // Check if contact has Insurance Services focus area
  const showInsuranceSection = useMemo(() => {
    return hasInsuranceServicesFocusArea(contactData?.focusAreas);
  }, [contactData?.focusAreas]);

  // Filter general talking points (exclude insurance-specific)
  const generalPhrases = useMemo(() => {
    return phrases.filter(p => p.category === 'talking_points');
  }, [phrases]);

  // Get insurance-specific phrases from database
  const insurancePhrases = useMemo(() => {
    return phrases.filter(p => p.category === 'talking_points_insurance');
  }, [phrases]);

  // Check if current selection is an insurance phrase
  const isInsuranceSelection = useMemo(() => {
    if (!currentSelection?.phraseId) return false;
    return insurancePhrases.some(p => p.id === currentSelection.phraseId) ||
           currentSelection.isInsuranceSpecific === true;
  }, [currentSelection, insurancePhrases]);

  // Handle insurance phrase selection
  const handleInsuranceSelect = (phraseId: string) => {
    const phrase = insurancePhrases.find(p => p.id === phraseId);
    if (phrase) {
      onSelectionChange({
        type: 'phrase',
        category: 'talking_points_insurance',
        phraseId: phrase.id,
        phraseText: phrase.phrase_text,
        isInsuranceSpecific: true,
        defaultPhraseId: currentSelection?.defaultPhraseId,
        variables: previewVariables,
      });
    }
  };

  // Handle general phrase selection (from PhraseSelectorGeneric)
  const handleGeneralSelectionChange = (selection: ModuleSelection | null) => {
    if (selection) {
      // Ensure general selections don't have insurance flag
      onSelectionChange({
        ...selection,
        isInsuranceSpecific: false,
      });
    } else {
      onSelectionChange(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Talking Points Section */}
      <PhraseSelectorGeneric
        category="talking_points"
        categoryLabel="Suggested Talking Points"
        phrases={generalPhrases}
        currentSelection={isInsuranceSelection ? null : currentSelection}
        onSelectionChange={handleGeneralSelectionChange}
        multiSelect={false}
        contactData={contactData}
        previewVariables={previewVariables}
        contactName={contactName}
        defaultPhraseId={defaultPhraseId}
        onDefaultToggle={onDefaultToggle}
        allowInlineManagement={true}
        hidePreview={true}
      />

      {/* Insurance Services Strike Zone Section - Only shown for Insurance Services contacts */}
      {showInsuranceSection && insurancePhrases.length > 0 && (
        <>
          <Separator className="my-6" />
          
          <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Insurance Services Strike Zone</h3>
                <p className="text-sm text-muted-foreground">
                  Specialized language for Insurance Services focus area
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                <Building2 className="h-3 w-3 mr-1" />
                Insurance Services
              </Badge>
            </div>

            {/* Insurance Phrases Radio Group */}
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <RadioGroup
                value={isInsuranceSelection ? (currentSelection?.phraseId || '') : ''}
                onValueChange={handleInsuranceSelect}
              >
                {insurancePhrases.map((phrase) => (
                  <div
                    key={phrase.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      isInsuranceSelection && currentSelection?.phraseId === phrase.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    )}
                  >
                    <RadioGroupItem 
                      value={phrase.id} 
                      id={`insurance-${phrase.id}`}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor={`insurance-${phrase.id}`}
                      className="cursor-pointer flex-1 text-sm leading-relaxed"
                    >
                      {phrase.phrase_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Selection Info */}
            {isInsuranceSelection && currentSelection?.phraseText && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Selected Insurance Language:</p>
                <p className="text-sm">{currentSelection.phraseText}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Show indicator when Insurance Services focus area is detected but no phrases exist */}
      {showInsuranceSection && insurancePhrases.length === 0 && (
        <>
          <Separator className="my-6" />
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-dashed">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Insurance Services Focus Area Detected</p>
              <p className="text-xs text-muted-foreground">
                No insurance-specific phrases found in the library. Add them in Global Libraries.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
