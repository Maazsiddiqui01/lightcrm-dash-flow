import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface PlatformsSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    id?: string;
    firstName?: string;
    organization?: string;
    focusAreas?: string[];
  };
}

export function PlatformsSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
}: PlatformsSelectorProps) {
  const previewVariables = {
    platform_name: contactData?.focusAreas?.[0] || 'Healthcare IT',
    organization: contactData?.organization || 'Acme Corp',
  };

  return (
    <PhraseSelectorGeneric
      category="platforms"
      categoryLabel="Platforms"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
      moduleKey="platforms"
      hidePreview={true}
    />
  );
}
