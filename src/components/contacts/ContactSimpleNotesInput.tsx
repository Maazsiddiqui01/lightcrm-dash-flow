import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContactSimpleNotesInputProps {
  title: string;
  field: 'next_steps' | 'notes';
  placeholder?: string;
  currentValue?: string | null;
  onSave: (content: string, dueDate?: string, addInToDo?: boolean) => void;
  isSaving: boolean;
}

export function ContactSimpleNotesInput({
  title,
  field,
  placeholder,
  currentValue,
  onSave,
  isSaving,
}: ContactSimpleNotesInputProps) {
  const [draft, setDraft] = useState(currentValue || '');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [addInToDo, setAddInToDo] = useState(true);

  const isNextSteps = field === 'next_steps';

  const handleSave = () => {
    if (!draft.trim()) return;

    const dueDateString = dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined;
    onSave(draft.trim(), dueDateString, isNextSteps ? addInToDo : undefined);

    // Clear the form after saving
    setDraft('');
    setDueDate(undefined);
    setAddInToDo(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const canSave = draft.trim().length > 0;

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card">
      <Label className="text-sm font-medium">{title}</Label>

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || `Enter ${title.toLowerCase()}...`}
        rows={3}
        className="min-h-[80px] resize-none"
      />

      {/* Due Date and Add to Do - Only for Next Steps */}
      {isNextSteps && (
        <div className="flex flex-wrap items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'justify-start text-left font-normal',
                  !dueDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, 'PPP') : 'Due date (optional)'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`add-in-todo-${field}`}
              checked={addInToDo}
              onCheckedChange={(checked) => setAddInToDo(checked as boolean)}
            />
            <Label htmlFor={`add-in-todo-${field}`} className="text-sm">
              Add in To Do
            </Label>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">Press Ctrl+Enter to save</p>
        <Button onClick={handleSave} disabled={isSaving || !canSave} size="sm">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
