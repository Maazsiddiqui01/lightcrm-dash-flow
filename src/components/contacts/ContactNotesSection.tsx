import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

interface ContactNote {
  id: string;
  contact_id: string;
  field: string;
  content: string;
  created_at: string;
  created_by: string | null;
}

interface ContactCurrentNotes {
  notes: string | null;
  updated_at: string | null;
}

interface ContactNotesSectionProps {
  title: string;
  field: string;
  currentValue: string | null;
  timeline: ContactNote[];
  onSave: (content: string) => void;
  onDelete?: (eventId: string) => void;
  isLoadingCurrent: boolean;
  isLoadingTimeline: boolean;
  isSaving: boolean;
  isDeleting?: boolean;
}

export function ContactNotesSection({
  title,
  field,
  currentValue,
  timeline,
  onSave,
  onDelete,
  isLoadingCurrent,
  isLoadingTimeline,
  isSaving,
  isDeleting = false,
}: ContactNotesSectionProps) {
  const [draft, setDraft] = useState(currentValue || '');
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Sync draft with current value when it changes
  useEffect(() => {
    setDraft(currentValue || '');
  }, [currentValue]);

  const handleSave = () => {
    if (draft.trim() !== (currentValue || '').trim()) {
      onSave(draft.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
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
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDeleteClick = (eventId: string | undefined) => {
    if (!eventId) return;
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

  const canSave = draft.trim() !== (currentValue || '').trim() && draft.trim() !== '';
  const hasUnsavedChanges = draft.trim() !== (currentValue || '').trim();

  // Filter timeline to show only notes for this field
  const filteredTimeline = timeline.filter(entry => entry.field === field);

  const formatContent = (content: string, isExpanded: boolean) => {
    if (content.length <= 150 || isExpanded) {
      return content;
    }
    return content.substring(0, 150) + '...';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Value Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Current {title}</h4>
          </div>
          
          {isLoadingCurrent ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter ${title.toLowerCase()}...`}
              rows={4}
              className="resize-none"
            />
          )}
          
          <div className="flex items-center justify-between">
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

        {/* Timeline */}
        <div className="space-y-2">
          <h4 className="font-medium">Timeline</h4>
          
          {isLoadingTimeline ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No timeline entries yet. Add your first note above.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTimeline.map((entry, index) => {
                const isExpanded = expandedEntries.has(index);
                const shouldShowToggle = entry.content.length > 150;
                
                return (
                  <div key={`${entry.created_at}-${index}`} className="border rounded-lg p-3 bg-muted/50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-medium">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(entry.content)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {onDelete && entry.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(entry.id)}
                            disabled={isDeleting}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm whitespace-pre-wrap">
                        {formatContent(entry.content, isExpanded)}
                      </p>
                      
                      {shouldShowToggle && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(index)}
                          className="h-8 px-2 text-xs"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Show More
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}