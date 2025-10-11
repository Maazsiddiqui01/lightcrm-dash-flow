import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface AddonsSelectorProps {
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

export function AddonsSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
}: AddonsSelectorProps) {
  const previewVariables = {
    first_name: contactData?.firstName || 'John',
  };

  return (
    <PhraseSelectorGeneric
      category="addons"
      categoryLabel="Add-ons"
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
    />
  );
}
