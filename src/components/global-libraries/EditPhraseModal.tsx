import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { TriStateToggle } from '@/components/email-builder/TriStateToggle';
import { useUpdatePhrase } from '@/hooks/usePhraseLibrary';
import type { PhraseLibraryItem, TriState } from '@/types/phraseLibrary';

interface EditPhraseModalProps {
  phrase: PhraseLibraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPhraseModal({ phrase, open, onOpenChange }: EditPhraseModalProps) {
  const [phraseText, setPhraseText] = useState(phrase?.phrase_text || '');
  const [triState, setTriState] = useState<TriState>(phrase?.tri_state || 'sometimes');
  const [applyScope, setApplyScope] = useState<'all' | 'local'>('all');
  const [updateTriState, setUpdateTriState] = useState(false);
  
  const updatePhrase = useUpdatePhrase();

  const handleSave = () => {
    if (!phrase) return;

    updatePhrase.mutate({
      id: phrase.id,
      updates: {
        phrase_text: phraseText,
        tri_state: triState as TriState,
      },
      applyToAll: applyScope === 'all',
      updateTriStateDefaults: applyScope === 'all' && updateTriState
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  if (!phrase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Phrase</DialogTitle>
          <DialogDescription>
            Modify this phrase and choose whether to apply changes globally or locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phrase Text */}
          <div className="space-y-2">
            <Label>Phrase Text</Label>
            <Textarea
              value={phraseText}
              onChange={(e) => setPhraseText(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tri-State Toggle */}
          <div className="space-y-2">
            <Label>Inclusion Frequency</Label>
            <TriStateToggle value={triState} onChange={setTriState} />
          </div>

          {/* Apply Scope */}
          <div className="space-y-3">
            <Label>Apply this change to:</Label>
            <RadioGroup value={applyScope} onValueChange={(val) => setApplyScope(val as 'all' | 'local')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="apply-all" />
                <Label htmlFor="apply-all" className="font-normal cursor-pointer">
                  All templates (update global library)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="local" id="apply-local" />
                <Label htmlFor="apply-local" className="font-normal cursor-pointer">
                  This template only (create template-specific override)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Update Tri-State Checkbox (only for global) */}
          {applyScope === 'all' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-tristate"
                checked={updateTriState}
                onCheckedChange={(checked) => setUpdateTriState(checked as boolean)}
              />
              <Label htmlFor="update-tristate" className="font-normal cursor-pointer">
                Also update tri-state defaults for all templates
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!phraseText.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
