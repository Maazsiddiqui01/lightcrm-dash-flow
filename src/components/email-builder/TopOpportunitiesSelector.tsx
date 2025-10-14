import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface TopOpportunitiesSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    id?: string;
    firstName?: string;
    organization?: string;
    opportunities?: Array<{ dealName: string; monthsSince?: number }>;
  };
  contactName?: string;
  defaultPhraseId?: string;
  onDefaultToggle?: (phraseId: string | null) => void;
}

export function TopOpportunitiesSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
}: TopOpportunitiesSelectorProps) {
  // Get top opportunity for preview
  const topOpp = contactData?.opportunities?.[0];
  
  const previewVariables = {
    opportunity_name: topOpp?.dealName || 'Franklin Madison',
    months_since: topOpp?.monthsSince || 2,
    first_name: contactData?.firstName || 'John',
  };

  return (
    <PhraseSelectorGeneric
      category="top_opportunities"
      categoryLabel="Top Opportunities"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
      contactName={contactName}
      defaultPhraseId={defaultPhraseId}
      onDefaultToggle={onDefaultToggle}
      moduleKey="top_opportunities"
    />
  );
}
