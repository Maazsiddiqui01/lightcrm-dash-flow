import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface AIBackupSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    firstName?: string;
    organization?: string;
  };
}

export function AIBackupSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
}: AIBackupSelectorProps) {
  const previewVariables = {
    first_name: contactData?.firstName || 'John',
    organization: contactData?.organization || 'Acme Corp',
  };

  return (
    <PhraseSelectorGeneric
      category="ai_backup"
      categoryLabel="AI Backup Personalization"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
    />
  );
}
