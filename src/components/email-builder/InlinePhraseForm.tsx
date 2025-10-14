import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TriStateToggle } from "./TriStateToggle";
import type { PhraseCategory, TriState } from "@/types/phraseLibrary";

interface InlinePhraseFormProps {
  category: PhraseCategory;
  initialText?: string;
  initialTriState?: TriState;
  initialStyle?: 'formal' | 'hybrid' | 'casual';
  onSave: (phraseText: string, triState: TriState, style?: 'formal' | 'hybrid' | 'casual') => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
  isLoading?: boolean;
}

export function InlinePhraseForm({
  category,
  initialText = '',
  initialTriState = 'sometimes',
  initialStyle = 'hybrid',
  onSave,
  onCancel,
  mode,
  isLoading = false,
}: InlinePhraseFormProps) {
  const [phraseText, setPhraseText] = useState(initialText);
  const [triState, setTriState] = useState<TriState>(initialTriState);
  const [style, setStyle] = useState<'formal' | 'hybrid' | 'casual'>(initialStyle);
  
  const isSubject = category === 'subject';

  const handleSave = () => {
    if (phraseText.trim()) {
      onSave(phraseText.trim(), triState, isSubject ? style : undefined);
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
          placeholder={isSubject ? 'Enter subject line... Use [My Org], [Their Org], [Focus Area], [Sector]' : "Enter phrase text... Use {variable_name} for dynamic content"}
          rows={3}
          className="resize-none"
          disabled={isLoading}
          autoFocus
        />
        {isSubject && (
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs font-mono">[My Org]</Badge>
            <Badge variant="outline" className="text-xs font-mono">[Their Org]</Badge>
            <Badge variant="outline" className="text-xs font-mono">[Focus Area]</Badge>
            <Badge variant="outline" className="text-xs font-mono">[Sector]</Badge>
          </div>
        )}
        {phraseText.trim().length === 0 && (
          <p className="text-xs text-destructive">Phrase text is required</p>
        )}
      </div>

      {isSubject && (
        <div className="space-y-2">
          <Label htmlFor="subject-style">Style</Label>
          <Select value={style} onValueChange={(v) => setStyle(v as 'formal' | 'hybrid' | 'casual')}>
            <SelectTrigger id="subject-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

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