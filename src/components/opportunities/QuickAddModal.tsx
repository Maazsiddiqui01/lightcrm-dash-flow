import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOpportunityNotes } from '@/hooks/useOpportunityNotes';

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: string;
  type: 'next_steps' | 'most_recent_notes';
  opportunityName: string;
}

export function QuickAddModal({
  open,
  onOpenChange,
  opportunityId,
  type,
  opportunityName,
}: QuickAddModalProps) {
  const [content, setContent] = useState('');
  const { saveNextSteps, saveMostRecentNotes, isSavingNextSteps, isSavingNotes } = useOpportunityNotes(opportunityId);

  const isNextSteps = type === 'next_steps';
  const title = isNextSteps ? 'Add New Next Step' : 'Add New Note';
  const description = `Add a new ${isNextSteps ? 'next step' : 'note'} for ${opportunityName}`;
  const placeholder = `Enter ${isNextSteps ? 'next step' : 'note'} details...`;
  const isSaving = isNextSteps ? isSavingNextSteps : isSavingNotes;

  const handleSave = () => {
    if (!content.trim()) return;

    const saveFunction = isNextSteps ? saveNextSteps : saveMostRecentNotes;
    saveFunction({ opportunityId, content: content.trim() }, {
      onSuccess: () => {
        // Close modal and reset content only on successful save
        setContent('');
        onOpenChange(false);
      }
    });
  };

  const handleCancel = () => {
    setContent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!content.trim() || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}