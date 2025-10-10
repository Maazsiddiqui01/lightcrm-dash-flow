import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface GeneralOrgUpdateSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    firstName?: string;
    organization?: string;
  };
}

export function GeneralOrgUpdateSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
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
    />
  );
}
