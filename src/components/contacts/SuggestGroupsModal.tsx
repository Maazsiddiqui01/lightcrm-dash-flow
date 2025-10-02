import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Users, Mail, Calendar, Check, X, Edit2 } from 'lucide-react';
import { useSuggestGroups, useCreateGroupFromSuggestion, GroupSuggestion } from '@/hooks/useSuggestGroups';
import { formatDistanceToNow } from 'date-fns';

interface SuggestGroupsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestGroupsModal({ open, onOpenChange }: SuggestGroupsModalProps) {
  const queryClient = useQueryClient();
  const { mutate: analyzeSuggestions, data: suggestions, isPending } = useSuggestGroups();
  const { mutate: createGroup, isPending: isCreating } = useCreateGroupFromSuggestion();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [createdGroups, setCreatedGroups] = useState<Set<string>>(new Set());

  const handleAnalyze = () => {
    analyzeSuggestions();
  };

  const handleCreateGroup = (suggestion: GroupSuggestion) => {
    const groupName = editedNames[suggestion.id] || suggestion.suggestedName;
    const contactIds = suggestion.members.filter(m => m.contactId).map(m => m.contactId!);

    if (contactIds.length === 0) {
      return;
    }

    createGroup(
      { groupName, contactIds },
      {
        onSuccess: () => {
          setCreatedGroups(prev => new Set(prev).add(suggestion.id));
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
      }
    );
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      high: { label: 'High Confidence', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      low: { label: 'Low', className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
    };
    const config = variants[confidence] || variants.low;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const groupedSuggestions = {
    high: suggestions?.filter(s => s.confidence === 'high') || [],
    medium: suggestions?.filter(s => s.confidence === 'medium') || [],
    low: suggestions?.filter(s => s.confidence === 'low') || [],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Suggest Contact Groups
          </DialogTitle>
          <DialogDescription>
            Automatically identify groups of people who frequently email together
          </DialogDescription>
        </DialogHeader>

        {!suggestions && !isPending && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Users className="h-16 w-16 text-muted-foreground/50" />
            <p className="text-muted-foreground text-center max-w-md">
              Analyze your email interactions to discover groups of people who frequently communicate together
            </p>
            <Button onClick={handleAnalyze} size="lg">
              Start Analysis
            </Button>
          </div>
        )}

        {isPending && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing email interactions...</p>
          </div>
        )}

        {suggestions && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Users className="h-16 w-16 text-muted-foreground/50" />
            <p className="text-muted-foreground">No group suggestions found</p>
            <Button onClick={handleAnalyze} variant="outline">
              Analyze Again
            </Button>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <ScrollArea className="max-h-[calc(85vh-200px)]">
            <div className="space-y-6 pr-4">
              {groupedSuggestions.high.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-emerald-600 dark:text-emerald-400">
                    High Confidence ({groupedSuggestions.high.length})
                  </h3>
                  <div className="space-y-3">
                    {groupedSuggestions.high.map(suggestion => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        isCreated={createdGroups.has(suggestion.id)}
                        isCreating={isCreating}
                        isEditing={editingId === suggestion.id}
                        editedName={editedNames[suggestion.id]}
                        onEdit={() => setEditingId(suggestion.id)}
                        onNameChange={(name) => setEditedNames(prev => ({ ...prev, [suggestion.id]: name }))}
                        onSaveEdit={() => setEditingId(null)}
                        onCreate={() => handleCreateGroup(suggestion)}
                        getConfidenceBadge={getConfidenceBadge}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groupedSuggestions.medium.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-amber-600 dark:text-amber-400">
                      Medium Confidence ({groupedSuggestions.medium.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedSuggestions.medium.map(suggestion => (
                        <SuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          isCreated={createdGroups.has(suggestion.id)}
                          isCreating={isCreating}
                          isEditing={editingId === suggestion.id}
                          editedName={editedNames[suggestion.id]}
                          onEdit={() => setEditingId(suggestion.id)}
                          onNameChange={(name) => setEditedNames(prev => ({ ...prev, [suggestion.id]: name }))}
                          onSaveEdit={() => setEditingId(null)}
                          onCreate={() => handleCreateGroup(suggestion)}
                          getConfidenceBadge={getConfidenceBadge}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {groupedSuggestions.low.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                      Low Confidence ({groupedSuggestions.low.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedSuggestions.low.map(suggestion => (
                        <SuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          isCreated={createdGroups.has(suggestion.id)}
                          isCreating={isCreating}
                          isEditing={editingId === suggestion.id}
                          editedName={editedNames[suggestion.id]}
                          onEdit={() => setEditingId(suggestion.id)}
                          onNameChange={(name) => setEditedNames(prev => ({ ...prev, [suggestion.id]: name }))}
                          onSaveEdit={() => setEditingId(null)}
                          onCreate={() => handleCreateGroup(suggestion)}
                          getConfidenceBadge={getConfidenceBadge}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Found {suggestions.length} potential group{suggestions.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={handleAnalyze} variant="outline" size="sm">
              Refresh Analysis
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SuggestionCardProps {
  suggestion: GroupSuggestion;
  isCreated: boolean;
  isCreating: boolean;
  isEditing: boolean;
  editedName?: string;
  onEdit: () => void;
  onNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onCreate: () => void;
  getConfidenceBadge: (confidence: string) => JSX.Element;
}

function SuggestionCard({
  suggestion,
  isCreated,
  isCreating,
  isEditing,
  editedName,
  onEdit,
  onNameChange,
  onSaveEdit,
  onCreate,
  getConfidenceBadge,
}: SuggestionCardProps) {
  const displayName = editedName || suggestion.suggestedName;
  const existingMembers = suggestion.members.filter(m => m.contactId);
  const missingMembers = suggestion.members.filter(m => !m.contactId);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedName || suggestion.suggestedName}
                onChange={(e) => onNameChange(e.target.value)}
                className="max-w-sm"
                autoFocus
              />
              <Button onClick={onSaveEdit} size="sm" variant="ghost">
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{displayName}</h4>
              <Button onClick={onEdit} size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            {getConfidenceBadge(suggestion.confidence)}
            <Badge variant="outline" className="gap-1">
              <Mail className="h-3 w-3" />
              {suggestion.interactionCount} emails
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {suggestion.members.length} members
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(suggestion.lastInteraction), { addSuffix: true })}
            </Badge>
          </div>

          {suggestion.sharedOrganization && (
            <p className="text-sm text-muted-foreground">
              Organization: {suggestion.sharedOrganization}
            </p>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Members:</p>
            <div className="flex flex-wrap gap-1">
              {suggestion.members.map((member, idx) => (
                <Badge key={idx} variant={member.contactId ? "secondary" : "outline"} className="text-xs">
                  {member.name || member.email}
                  {!member.contactId && <X className="h-2 w-2 ml-1" />}
                </Badge>
              ))}
            </div>
            {missingMembers.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {missingMembers.length} member(s) not in contacts
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isCreated ? (
            <Button size="sm" variant="outline" disabled className="gap-1">
              <Check className="h-4 w-4" />
              Created
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={onCreate}
              disabled={isCreating || existingMembers.length === 0}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Create Group'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
