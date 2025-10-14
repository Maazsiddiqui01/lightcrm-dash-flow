import { PhraseSelectorGeneric } from './PhraseSelectorGeneric';
import type { ModuleSelection } from "@/types/moduleSelections";
import type { SubjectLibraryItem } from "@/hooks/useSubjectLibrary";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";

interface SubjectLineSelectorProps {
  allSubjects: SubjectLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  toneOverride?: 'casual' | 'hybrid' | 'formal' | null;
  contactName?: string;
  defaultPhraseId?: string;
  onDefaultToggle?: (phraseId: string | null) => void;
  contactData?: {
    id?: string;
    firstName?: string;
  };
}

export function SubjectLineSelector({
  allSubjects,
  currentSelection,
  onSelectionChange,
  toneOverride,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
  contactData,
}: SubjectLineSelectorProps) {
  // Convert SubjectLibraryItem[] to PhraseLibraryItem[] format with all required fields
  const subjectsAsPhrases: PhraseLibraryItem[] = allSubjects.map(s => ({
    id: s.id,
    phrase_text: s.subject_template,
    category: 'subject' as const,
    template_id: null,
    tri_state: 'always' as const,
    weight: 1,
    is_global: true,
    sync_behavior: 'inherit' as const,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));
  
  // Filter by tone if override exists - check subject's own style property
  const filteredSubjects = toneOverride
    ? allSubjects.filter(s => s.style === toneOverride)
        .map(s => subjectsAsPhrases.find(p => p.id === s.id)!)
        .filter(Boolean)
    : subjectsAsPhrases;
  
  return (
    <PhraseSelectorGeneric
      category="subject"
      categoryLabel="Subject Line"
      phrases={filteredSubjects}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactName={contactName}
      defaultPhraseId={defaultPhraseId}
      onDefaultToggle={onDefaultToggle}
      allowInlineManagement={true}
      contactData={contactData}
      moduleKey="subject_line"
      subjectStyle={toneOverride ?? 'hybrid'}
    />
  );
}

