import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface AttachmentsSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    firstName?: string;
  };
}

export function AttachmentsSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
}: AttachmentsSelectorProps) {
  const previewVariables = {
    first_name: contactData?.firstName || 'John',
    attachment_type: 'presentation',
  };

  return (
    <PhraseSelectorGeneric
      category="attachments"
      categoryLabel="Attachments"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
    />
  );
}
