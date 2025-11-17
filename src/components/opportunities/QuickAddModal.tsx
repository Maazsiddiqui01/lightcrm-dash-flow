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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useOpportunityNotes } from '@/hooks/useOpportunityNotes';
import { formatDatePrefix } from '@/utils/dateUtils';

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
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [addInToDo, setAddInToDo] = useState(true);
  const { saveNextSteps, saveMostRecentNotes, isSavingNextSteps, isSavingNotes } = useOpportunityNotes(opportunityId, opportunityName);

  const isNextSteps = type === 'next_steps';
  const title = isNextSteps ? 'Add New Next Step' : 'Add New Note';
  const description = `Add a new ${isNextSteps ? 'next step' : 'note'} for ${opportunityName}`;
  const placeholder = `Enter ${isNextSteps ? 'next step' : 'note'} details...`;
  const isSaving = isNextSteps ? isSavingNextSteps : isSavingNotes;

  const handleSave = () => {
    if (!content.trim()) return;

    const contentWithDate = `${formatDatePrefix()}${content.trim()}`;

    if (isNextSteps) {
      const dueDateString = dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined;
      saveNextSteps(contentWithDate, dueDateString, addInToDo);
    } else {
      saveMostRecentNotes(contentWithDate);
    }
    
    // Close modal and reset content after save is initiated
    setContent('');
    setDueDate(undefined);
    setAddInToDo(true);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setContent('');
    setDueDate(undefined);
    setAddInToDo(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full"
          />
          
          {isNextSteps && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date (Optional)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Select due date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-in-todo"
                  checked={addInToDo}
                  onCheckedChange={(checked) => setAddInToDo(checked as boolean)}
                />
                <Label htmlFor="add-in-todo" className="text-sm font-medium">
                  Add in To Do
                </Label>
              </div>
            </div>
          )}
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