import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, Copy, CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OpportunityNote {
  id: string;
  opportunity_id: string;
  field: string;
  content: string;
  due_date: string | null;
  created_at: string;
  created_by: string | null;
}

interface OpportunityNotesSectionProps {
  title: string;
  field: string;
  currentValue: string | null;
  currentDueDate?: string | null;
  timeline: OpportunityNote[];
  onSave: (content: string, dueDate?: string, addInToDo?: boolean) => void;
  onDelete?: (eventId: string) => void;
  isSaving: boolean;
  isDeleting?: boolean;
  isLoadingCurrent: boolean;
  isLoadingTimeline: boolean;
}

export function OpportunityNotesSection({
  title,
  field,
  currentValue,
  currentDueDate,
  timeline,
  onSave,
  onDelete,
  isSaving,
  isDeleting = false,
  isLoadingCurrent,
  isLoadingTimeline,
}: OpportunityNotesSectionProps) {
  const [draft, setDraft] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [addInToDo, setAddInToDo] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const isNextSteps = field === 'next_steps';

  // Sync draft state with current value
  useEffect(() => {
    setDraft(currentValue || '');
  }, [currentValue]);

  // Sync due date state with current due date
  useEffect(() => {
    if (currentDueDate) {
      setDueDate(new Date(currentDueDate));
    } else {
      setDueDate(undefined);
    }
  }, [currentDueDate]);

  const handleSave = () => {
    if (draft.trim() !== (currentValue || '').trim() || (isNextSteps && dueDate !== (currentDueDate ? new Date(currentDueDate) : undefined))) {
      const dueDateString = dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined;
      onSave(draft.trim(), dueDateString, isNextSteps ? addInToDo : undefined);
    }
  };

  const canSave = draft.trim() !== (currentValue || '').trim() || 
    (isNextSteps && dueDate?.toDateString() !== (currentDueDate ? new Date(currentDueDate).toDateString() : undefined));
  const hasUnsavedChanges = draft.trim() !== (currentValue || '').trim();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  // Calculate days left for due dates
  const calculateDaysLeft = (dueDateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateString);
    due.setHours(0, 0, 0, 0);
    return differenceInDays(due, today);
  };

  const getDaysLeftDisplay = (dueDateString: string) => {
    const daysLeft = calculateDaysLeft(dueDateString);
    if (daysLeft < 0) {
      return { text: `${Math.abs(daysLeft)} days overdue`, className: 'text-destructive' };
    } else if (daysLeft === 0) {
      return { text: 'Due today', className: 'text-warning' };
    } else {
      return { text: `${daysLeft} days left`, className: 'text-muted-foreground' };
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDeleteClick = (eventId: string) => {
    setEntryToDelete(eventId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (entryToDelete && onDelete) {
      onDelete(entryToDelete);
    }
    setDeleteConfirmOpen(false);
    setEntryToDelete(null);
  };

  // Filter timeline to only show entries for this field
  const fieldTimeline = timeline.filter(entry => entry.field === field);

  const formatContent = (content: string, isExpanded: boolean) => {
    const lines = content.split('\n');
    if (!isExpanded && lines.length > 4) {
      return lines.slice(0, 4).join('\n') + '...';
    }
    return content;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {/* Current Value Editor */}
          {isLoadingCurrent ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-9 w-24" />
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Enter ${title.toLowerCase()}...`}
                rows={3}
                className="min-h-[80px] resize-none"
              />
              
              {/* Due Date Section - Only for Next Steps */}
              {isNextSteps && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Due Date (Optional)</label>
                    {currentDueDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3" />
                        <span className={getDaysLeftDisplay(currentDueDate).className}>
                          {getDaysLeftDisplay(currentDueDate).text}
                        </span>
                      </div>
                    )}
                  </div>
                  
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

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="add-in-todo-section"
                      checked={addInToDo}
                      onCheckedChange={(checked) => setAddInToDo(checked as boolean)}
                    />
                    <Label htmlFor="add-in-todo-section" className="text-sm font-medium">
                      Add in To Do
                    </Label>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {hasUnsavedChanges ? (
                    <>Press Ctrl+Enter to save • <span className="text-warning">Unsaved changes</span></>
                  ) : (
                    'Press Ctrl+Enter to save'
                  )}
                </p>
                <Button
                  onClick={handleSave} 
                  disabled={isSaving || !draft.trim()}
                  size="sm"
                  variant={hasUnsavedChanges ? "default" : "outline"}
                >
                  {isSaving ? 'Saving...' : 'Save to Timeline'}
                </Button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Timeline</span>
            </div>
            
            {isLoadingTimeline ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : fieldTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                No history yet
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {fieldTimeline.map((entry) => {
                  const isExpanded = expandedEntries.has(entry.id);
                  const needsExpansion = entry.content.split('\n').length > 4;
                  
                  return (
                    <div
                      key={entry.id}
                      className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                        <div className="flex items-center gap-2">
                          {entry.due_date && (
                            <Badge variant="outline" className="text-xs">
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              Due: {format(new Date(entry.due_date), 'MMM d, yyyy')}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(entry.content)}
                            className="h-auto p-1"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-sm whitespace-pre-wrap">
                        {formatContent(entry.content, isExpanded)}
                      </div>
                      
                      {needsExpansion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 mt-1 p-0 text-xs text-muted-foreground"
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Show more
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}