import { useMemo, useEffect } from "react";
import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface GreetingSelectorProps {
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

export function GreetingSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
}: GreetingSelectorProps) {
  // Find "Hi [First Name]," phrase for default
  const defaultGreetingPhrase = useMemo(() => {
    return phrases.find(p => 
      p.category === 'greeting' && 
      p.phrase_text.trim().toLowerCase() === 'hi {first_name},'
    );
  }, [phrases]);

  // Auto-select "Hi [First Name]," if no selection and phrase exists
  useEffect(() => {
    if (!currentSelection?.phraseId && !currentSelection?.greetingId && defaultGreetingPhrase) {
      onSelectionChange({
        type: 'phrase',
        category: 'greeting',
        phraseId: defaultGreetingPhrase.id,
        phraseText: defaultGreetingPhrase.phrase_text,
        defaultPhraseId: defaultPhraseId,
        isDefault: defaultGreetingPhrase.id === defaultPhraseId,
        variables: { first_name: contactData?.firstName || 'John' },
      });
    }
  }, [currentSelection, defaultGreetingPhrase, defaultPhraseId, contactData?.firstName, onSelectionChange]);

  const previewVariables = {
    first_name: contactData?.firstName || 'John',
  };

  return (
    <PhraseSelectorGeneric
      category="greeting"
      categoryLabel="Initial Greeting"
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
