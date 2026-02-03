import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Copy, CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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
import { Separator } from '@/components/ui/separator';

interface OpportunityNote {
  id: string;
  opportunity_id: string;
  field: string;
  content: string;
  due_date: string | null;
  created_at: string;
  created_by: string | null;
}

interface OpportunityHistoryTabProps {
  timeline: OpportunityNote[];
  onDelete?: (eventId: string) => void;
  isLoading: boolean;
  isDeleting?: boolean;
}

export function OpportunityHistoryTab({
  timeline,
  onDelete,
  isLoading,
  isDeleting = false,
}: OpportunityHistoryTabProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'next_steps' | 'most_recent_notes'>('all');
  const { toast } = useToast();

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
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

  const formatContent = (content: string, isExpanded: boolean) => {
    const lines = content.split('\n');
    if (!isExpanded && lines.length > 4) {
      return lines.slice(0, 4).join('\n') + '...';
    }
    return content;
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'next_steps':
        return 'Next Steps';
      case 'most_recent_notes':
        return 'Notes';
      default:
        return field;
    }
  };

  const getFieldBadgeColor = (field: string) => {
    switch (field) {
      case 'next_steps':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'most_recent_notes':
        return 'bg-secondary/80 text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Filter and sort timeline
  const filteredTimeline = timeline
    .filter(entry => filterType === 'all' || entry.field === filterType)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
        >
          All ({timeline.length})
        </Button>
        <Button
          variant={filterType === 'next_steps' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('next_steps')}
        >
          Next Steps ({timeline.filter(e => e.field === 'next_steps').length})
        </Button>
        <Button
          variant={filterType === 'most_recent_notes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('most_recent_notes')}
        >
          Notes ({timeline.filter(e => e.field === 'most_recent_notes').length})
        </Button>
      </div>

      <Separator />

      {/* Timeline */}
      {filteredTimeline.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No history yet</p>
          <p className="text-sm">Activity will appear here as you add next steps and notes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTimeline.map((entry) => {
            const isExpanded = expandedEntries.has(entry.id);
            const needsExpansion = entry.content.split('\n').length > 4;

            return (
              <div
                key={entry.id}
                className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getFieldBadgeColor(entry.field)}
                    >
                      {getFieldLabel(entry.field)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
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
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(entry.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-sm whitespace-pre-wrap">
                  {formatContent(entry.content, isExpanded)}
                </div>

                {needsExpansion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 mt-2 p-0 text-xs text-muted-foreground"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
