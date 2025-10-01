import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { TriStateToggle } from '@/components/email-builder/TriStateToggle';
import { useUpdateInquiry } from '@/hooks/useInquiryLibrary';
import type { TriState } from '@/types/phraseLibrary';

interface InquiryLibraryItem {
  id: string;
  inquiry_text: string;
  tri_state: TriState;
  category: string;
  is_global: boolean;
  template_id: string | null;
}

interface EditInquiryModalProps {
  inquiry: InquiryLibraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInquiryModal({ inquiry, open, onOpenChange }: EditInquiryModalProps) {
  const [inquiryText, setInquiryText] = useState(inquiry?.inquiry_text || '');
  const [triState, setTriState] = useState<TriState>(inquiry?.tri_state || 'sometimes');
  const [applyScope, setApplyScope] = useState<'all' | 'local'>('all');
  const [updateTriState, setUpdateTriState] = useState(false);
  
  const updateInquiry = useUpdateInquiry();

  const handleSave = () => {
    if (!inquiry) return;

    updateInquiry.mutate({
      id: inquiry.id,
      updates: {
        inquiry_text: inquiryText,
        tri_state: triState as TriState,
      },
      applyToAll: applyScope === 'all',
      updateTriStateDefaults: applyScope === 'all' && updateTriState
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  if (!inquiry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Inquiry</DialogTitle>
          <DialogDescription>
            Modify this inquiry and choose whether to apply changes globally or locally.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inquiry Text */}
          <div className="space-y-2">
            <Label>Inquiry Text</Label>
            <Textarea
              value={inquiryText}
              onChange={(e) => setInquiryText(e.target.value)}
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
          <Button onClick={handleSave} disabled={!inquiryText.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
