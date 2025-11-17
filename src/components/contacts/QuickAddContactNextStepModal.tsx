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
import { useContactNextSteps } from '@/hooks/useContactNextSteps';
import { formatDatePrefix } from '@/utils/dateUtils';

interface QuickAddContactNextStepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
}

export function QuickAddContactNextStepModal({
  open,
  onOpenChange,
  contactId,
  contactName,
}: QuickAddContactNextStepModalProps) {
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [addInToDo, setAddInToDo] = useState(true);
  const { saveNextSteps, isSaving } = useContactNextSteps(contactId, contactName);

  const handleSave = () => {
    if (!content.trim()) return;

    const contentWithDate = `${formatDatePrefix()}${content.trim()}`;
    const dueDateString = dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined;
    saveNextSteps(contentWithDate, dueDateString, addInToDo);
    
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
          <DialogTitle>Add New Next Step</DialogTitle>
          <DialogDescription>
            Add a new next step for {contactName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Enter next step details..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full"
          />
          
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
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
