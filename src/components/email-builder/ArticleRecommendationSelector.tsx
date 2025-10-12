import { PhraseSelectorGeneric } from "./PhraseSelectorGeneric";
import type { PhraseLibraryItem } from "@/types/phraseLibrary";
import type { ModuleSelection } from "@/types/moduleSelections";

interface ArticleRecommendationSelectorProps {
  phrases: PhraseLibraryItem[];
  currentSelection: ModuleSelection | null;
  onSelectionChange: (selection: ModuleSelection | null) => void;
  contactData?: {
    firstName?: string;
    organization?: string;
    focusAreas?: string[];
  };
  selectedArticleUrl?: string;
  contactName?: string;
  defaultPhraseId?: string;
  onDefaultToggle?: (phraseId: string | null) => void;
}

export function ArticleRecommendationSelector({
  phrases,
  currentSelection,
  onSelectionChange,
  contactData,
  selectedArticleUrl,
  contactName,
  defaultPhraseId,
  onDefaultToggle,
}: ArticleRecommendationSelectorProps) {
  const previewVariables = {
    article_url: selectedArticleUrl || 'https://example.com/article',
    article_title: 'Example Article Title',
    focus_area: contactData?.focusAreas?.[0] || 'Healthcare IT',
    organization: contactData?.organization || 'Acme Corp',
    first_name: contactData?.firstName || 'John',
  };

  return (
    <PhraseSelectorGeneric
      category="article_recommendations"
      categoryLabel="Article Recommendations"
      phrases={phrases}
      currentSelection={currentSelection}
      onSelectionChange={onSelectionChange}
      multiSelect={false}
      contactData={contactData}
      previewVariables={previewVariables}
      contactName={contactName}
      defaultPhraseId={defaultPhraseId}
      onDefaultToggle={onDefaultToggle}
    />
  );
}
