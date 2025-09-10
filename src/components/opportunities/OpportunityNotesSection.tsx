import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Clock, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { OpportunityNote } from '@/hooks/useOpportunityNotes';

interface OpportunityNotesSectionProps {
  title: string;
  field: 'next_steps' | 'most_recent_notes';
  currentValue: string | null;
  timeline: OpportunityNote[];
  onSave: (content: string) => void;
  isSaving: boolean;
  isLoadingCurrent: boolean;
  isLoadingTimeline: boolean;
}

export function OpportunityNotesSection({
  title,
  field,
  currentValue,
  timeline,
  onSave,
  isSaving,
  isLoadingCurrent,
  isLoadingTimeline,
}: OpportunityNotesSectionProps) {
  const [draft, setDraft] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Update draft when currentValue changes
  useEffect(() => {
    setDraft(currentValue || '');
  }, [currentValue]);

  const handleSave = () => {
    if (draft.trim() && draft !== (currentValue || '')) {
      onSave(draft.trim());
    }
  };

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

  const isChanged = draft !== (currentValue || '');
  const canSave = draft.trim() && isChanged && !isSaving;

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
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Value Editor */}
          <div className="space-y-2">
            <Label htmlFor={field}>Current {title}</Label>
            {isLoadingCurrent ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-2">
                <Textarea
                  id={field}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Enter ${title.toLowerCase()}...`}
                  className="min-h-[80px] resize-none"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {draft.length} characters • Press Ctrl+Enter to save
                  </span>
                  <Button
                    onClick={handleSave}
                    disabled={!canSave}
                    size="sm"
                    className="h-8"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Timeline</Label>
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
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), 'MMM d, yyyy • h:mm a')}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(entry.content)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {needsExpansion && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpanded(entry.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {formatContent(entry.content, isExpanded)}
                      </div>
                      {needsExpansion && !isExpanded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 mt-1 p-0 text-xs text-muted-foreground"
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          Show more
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}