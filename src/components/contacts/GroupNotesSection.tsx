import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupNote {
  group_id?: string;  // New many-to-many system
  group_name?: string;  // Legacy support
  field: string;
  content: string;
  created_at: string;
  created_by: string | null;
}

interface GroupNotesSectionProps {
  title: string;
  field: string;
  currentValue: string | null;
  timeline: GroupNote[];
  onSave: (content: string) => void;
  isLoadingCurrent: boolean;
  isLoadingTimeline: boolean;
  isSaving: boolean;
  showSharedIndicator?: boolean;
}

export function GroupNotesSection({
  title,
  field,
  currentValue,
  timeline,
  onSave,
  isLoadingCurrent,
  isLoadingTimeline,
  isSaving,
  showSharedIndicator = false,
}: GroupNotesSectionProps) {
  const [draft, setDraft] = useState(currentValue || '');
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());
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

  const canSave = draft.trim() !== (currentValue || '').trim() && draft.trim() !== '';

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
        <CardTitle className="text-lg flex items-center gap-2">
          {showSharedIndicator && <Users className="h-5 w-5 text-muted-foreground" />}
          {title}
          {showSharedIndicator && (
            <span className="text-sm font-normal text-muted-foreground">(Shared with all group members)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Value Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Current {title}</h4>
            {canSave && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
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
          
          {canSave && (
            <p className="text-sm text-muted-foreground">
              Press Ctrl+Enter (Cmd+Enter on Mac) to save
            </p>
          )}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(entry.content)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
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
    </Card>
  );
}
