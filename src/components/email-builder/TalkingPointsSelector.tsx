import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface TalkingPointsSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    firstName?: string;
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

  return (
    <PhraseSelectorGeneric
      category="talking_points"
      categoryLabel="Suggested Talking Points"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
      contactName={contactName}
      defaultPhraseId={defaultPhraseId}
      onDefaultToggle={onDefaultToggle}
      allowInlineManagement={true}
      hidePreview={true}
    />
  );
}
