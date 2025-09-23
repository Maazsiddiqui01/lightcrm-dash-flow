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
import { useContactNotes } from '@/hooks/useContactNotes';

interface QuickAddContactNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
}

export function QuickAddContactNoteModal({
  open,
  onOpenChange,
  contactId,
  contactName,
}: QuickAddContactNoteModalProps) {
  const [content, setContent] = useState('');
  const { saveNotes, isSavingNotes } = useContactNotes(contactId);

  const handleSave = async () => {
    if (content.trim()) {
      saveNotes(content.trim());
      // Wait a bit for the save to complete, then close
      setTimeout(() => {
        setContent('');
        onOpenChange(false);
      }, 500);
    }
  };

  const handleCancel = () => {
    setContent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
          <DialogDescription>
            Add a note for {contactName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your note..."
            rows={4}
            className="resize-none"
            autoFocus
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || isSavingNotes}
          >
            {isSavingNotes ? 'Saving...' : 'Save Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}