import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface MeetingRequestSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    id?: string;
    firstName?: string;
  };
  contactName?: string;
  defaultPhraseId?: string;
  onDefaultToggle?: (phraseId: string | null) => void;
  focusedContactId?: string | null;
}

export function MeetingRequestSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
  focusedContactId,
}: MeetingRequestSelectorProps) {
  const previewVariables = {
    first_name: contactData?.firstName || 'John',
    assistant_name: 'Sarah',
  };

  return (
    <PhraseSelectorGeneric
      category="meeting_request"
      categoryLabel="Meeting Request"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
      contactName={contactName}
      defaultPhraseId={defaultPhraseId}
      onDefaultToggle={onDefaultToggle}
      moduleKey="meeting_request"
      focusedContactId={focusedContactId}
      hidePreview={true}
    />
  );
}
