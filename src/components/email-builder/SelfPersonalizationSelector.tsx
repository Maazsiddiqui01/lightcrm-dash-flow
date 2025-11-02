import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface SelfPersonalizationSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    id?: string;
    firstName?: string;
    organization?: string;
    focusAreas?: string[];
  };
  contactName?: string;
  defaultPhraseId?: string;
  onDefaultToggle?: (phraseId: string | null) => void;
  focusedContactId?: string | null;
}

export function SelfPersonalizationSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
  focusedContactId,
}: SelfPersonalizationSelectorProps) {
  const previewVariables = {
    first_name: contactData?.firstName || 'John',
    organization: contactData?.organization || 'Acme Corp',
    focus_area: contactData?.focusAreas?.[0] || 'Healthcare Services',
  };

  return (
    <PhraseSelectorGeneric
      category="self_personalization"
      categoryLabel="Self Personalization"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
      contactName={contactName}
      defaultPhraseId={defaultPhraseId}
      onDefaultToggle={onDefaultToggle}
      moduleKey="self_personalization"
      focusedContactId={focusedContactId}
      hidePreview={true}
    />
  );
}
