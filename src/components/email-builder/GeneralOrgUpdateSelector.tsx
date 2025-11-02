import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface GeneralOrgUpdateSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    id?: string;
    firstName?: string;
    organization?: string;
  };
  contactName?: string;
  defaultPhraseId?: string;
  onDefaultToggle?: (phraseId: string | null) => void;
  focusedContactId?: string | null;
}

export function GeneralOrgUpdateSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
  focusedContactId,
}: GeneralOrgUpdateSelectorProps) {
  const previewVariables = {
    organization: contactData?.organization || 'Acme Corp',
    my_org: 'LG Partners',
  };

  return (
    <PhraseSelectorGeneric
      category="org_update"
      categoryLabel="General Org Update"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
      contactName={contactName}
      defaultPhraseId={defaultPhraseId}
      onDefaultToggle={onDefaultToggle}
      moduleKey="general_org_update"
      focusedContactId={focusedContactId}
      hidePreview={true}
    />
  );
}
