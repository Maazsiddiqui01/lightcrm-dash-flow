import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TriStateToggle } from "./TriStateToggle";
import type { PhraseCategory, TriState } from "@/types/phraseLibrary";

interface InlinePhraseFormProps {
  category: PhraseCategory;
  initialText?: string;
  initialTriState?: TriState;
  onSave: (phraseText: string, triState: TriState) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
  isLoading?: boolean;
}

export function InlinePhraseForm({
  category,
  initialText = '',
  initialTriState = 'sometimes',
  onSave,
  onCancel,
  mode,
  isLoading = false,
}: InlinePhraseFormProps) {
  const [phraseText, setPhraseText] = useState(initialText);
  const [triState, setTriState] = useState<TriState>(initialTriState);

  const handleSave = () => {
    if (phraseText.trim()) {
      onSave(phraseText.trim(), triState);
    }
  };

  const isValid = phraseText.trim().length > 0;

  return (
    <div className="p-4 bg-muted/50 border-2 border-primary/20 rounded-lg space-y-3">
      <div className="space-y-2">
        <Label htmlFor="phrase-text" className="text-sm font-medium">
          {mode === 'create' ? 'New Phrase' : 'Edit Phrase'}
        </Label>
        <Textarea
          id="phrase-text"
          value={phraseText}
          onChange={(e) => setPhraseText(e.target.value)}
          placeholder="Enter phrase text... Use {variable_name} for dynamic content"
          rows={3}
          className="resize-none"
          disabled={isLoading}
          autoFocus
        />
        {phraseText.trim().length === 0 && (
          <p className="text-xs text-destructive">Phrase text is required</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Inclusion Frequency</Label>
        <TriStateToggle
          value={triState}
          onChange={setTriState}
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={!isValid || isLoading}
          size="sm"
          className="flex-1"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>

      {mode === 'create' && (
        <p className="text-xs text-muted-foreground">
          This phrase will be added to the global library and immediately available for selection.
        </p>
      )}
    </div>
  );
}
