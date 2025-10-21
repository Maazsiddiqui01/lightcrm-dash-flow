import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useSuggestGroups, type GroupSuggestion, type SuggestionMode } from '@/hooks/useSuggestGroups';
import { GroupConfigModal } from './GroupConfigModal';
import { Loader2, Users, Mail, Calendar, Sparkles, Building, Activity, X } from 'lucide-react';
import { format } from 'date-fns';

interface SuggestGroupsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestGroupsModal({ open, onOpenChange }: SuggestGroupsModalProps) {
  const [mode, setMode] = useState<SuggestionMode>('org_sector');
  const { mutate: analyzeSuggestions, data: suggestions, isPending } = useSuggestGroups(mode);
  
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<GroupSuggestion | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [memberSelections, setMemberSelections] = useState<Record<string, Set<string>>>({});

  const handleCreateGroup = (suggestion: GroupSuggestion) => {
    // Get selected members for this suggestion, or all if none selected
    const selectedMembers = memberSelections[suggestion.id];
    const membersToInclude = selectedMembers && selectedMembers.size > 0
      ? suggestion.members.filter(m => selectedMembers.has(m.email))
      : suggestion.members;
    
    setSelectedSuggestion({
      ...suggestion,
      members: membersToInclude
    });
    setConfigModalOpen(true);
  };

  const handleDismiss = (suggestionId: string) => {
    setDismissedIds(prev => new Set([...prev, suggestionId]));
  };

  const handleMemberToggle = (suggestionId: string, memberEmail: string) => {
    setMemberSelections(prev => {
      const current = prev[suggestionId] || new Set<string>();
      const newSet = new Set(current);
      
      if (newSet.has(memberEmail)) {
        newSet.delete(memberEmail);
      } else {
        newSet.add(memberEmail);
      }
      
      return {
        ...prev,
        [suggestionId]: newSet
      };
    });
  };

  const handleSelectAll = (suggestionId: string, allEmails: string[]) => {
    setMemberSelections(prev => ({
      ...prev,
      [suggestionId]: new Set(allEmails)
    }));
  };

  const handleDeselectAll = (suggestionId: string) => {
    setMemberSelections(prev => ({
      ...prev,
      [suggestionId]: new Set()
    }));
  };

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions?.filter(s => !dismissedIds.has(s.id)) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Suggest Contact Groups
            </DialogTitle>
            <DialogDescription>
              {mode === 'org_sector' 
                ? 'Group contacts by their organization and sector for structured team organization'
                : 'Automatically identify groups of people who frequently email together'
              }
            </DialogDescription>
          </DialogHeader>

          {!suggestions ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant={mode === 'org_sector' ? 'default' : 'outline'}
                  onClick={() => setMode('org_sector')}
                  className="flex-1"
                >
                  <Building className="h-4 w-4 mr-2" />
                  By Organization & Sector
                </Button>
                <Button
                  variant={mode === 'interaction' ? 'default' : 'outline'}
                  onClick={() => setMode('interaction')}
                  className="flex-1"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  By Latest Interaction
                </Button>
              </div>

              <Users className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Ready to Analyze</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  {mode === 'org_sector'
                    ? 'Group contacts by organization and sector for clear team structure'
                    : 'Analyze email interactions to discover natural contact groupings'
                  }
                </p>
              </div>
              <Button onClick={() => analyzeSuggestions()} disabled={isPending} size="lg">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Start Analysis
              </Button>
            </div>
          ) : visibleSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Users className="h-16 w-16 text-muted-foreground" />
              <p className="text-lg font-medium">
                {suggestions && suggestions.length > 0 ? 'All Suggestions Dismissed' : 'No Suggestions Found'}
              </p>
              <p className="text-sm text-muted-foreground">
                {suggestions && suggestions.length > 0 
                  ? 'You have dismissed all suggested groups. Click Re-analyze to start fresh.'
                  : mode === 'org_sector' 
                    ? 'No groups with 2+ members from the same organization and sector were found'
                    : 'No interaction patterns detected for grouping'
                }
              </p>
              {suggestions && suggestions.length > 0 && (
                <Button 
                  onClick={() => {
                    setDismissedIds(new Set());
                  }} 
                  variant="outline"
                >
                  Show Dismissed ({dismissedIds.size})
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {visibleSuggestions.length} of {suggestions.length} suggested group{suggestions.length !== 1 ? 's' : ''}
                  {dismissedIds.size > 0 && (
                    <span className="ml-2 text-xs">
                      ({dismissedIds.size} dismissed)
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  {dismissedIds.size > 0 && (
                    <Button 
                      onClick={() => setDismissedIds(new Set())} 
                      size="sm" 
                      variant="ghost"
                    >
                      Show All
                    </Button>
                  )}
                  <Button onClick={() => {
                    analyzeSuggestions();
                    setDismissedIds(new Set());
                  }} disabled={isPending} size="sm" variant="outline">
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Re-analyze
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {visibleSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    mode={mode}
                    selectedMembers={memberSelections[suggestion.id] || new Set()}
                    onCreateGroup={() => handleCreateGroup(suggestion)}
                    onDismiss={() => handleDismiss(suggestion.id)}
                    onMemberToggle={(email) => handleMemberToggle(suggestion.id, email)}
                    onSelectAll={() => handleSelectAll(suggestion.id, suggestion.members.map(m => m.email))}
                    onDeselectAll={() => handleDeselectAll(suggestion.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group Configuration Modal */}
      {selectedSuggestion && (
        <GroupConfigModal
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          suggestedName={selectedSuggestion.suggestedName}
          members={selectedSuggestion.members.map(m => ({
            contactId: m.contactId!,
            email: m.email,
            name: m.name || m.email
          }))}
          sector={selectedSuggestion.sector}
          focusArea={selectedSuggestion.focusArea}
          organization={selectedSuggestion.organization}
        />
      )}
    </>
  );
}

interface SuggestionCardProps {
  suggestion: GroupSuggestion;
  mode: SuggestionMode;
  selectedMembers: Set<string>;
  onCreateGroup: () => void;
  onDismiss: () => void;
  onMemberToggle: (email: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

function SuggestionCard({ suggestion, mode, selectedMembers, onCreateGroup, onDismiss, onMemberToggle, onSelectAll, onDeselectAll }: SuggestionCardProps) {
  // Initialize with all members selected if no selection exists
  const effectiveSelection = selectedMembers.size === 0 
    ? new Set(suggestion.members.map(m => m.email))
    : selectedMembers;
  
  const selectedCount = effectiveSelection.size;
  const totalCount = suggestion.members.length;
  const confidenceColor = {
    high: 'bg-green-500/10 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    low: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  }[suggestion.confidence];

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header with name and actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{suggestion.suggestedName}</h3>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              onClick={onDismiss}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Dismiss this suggestion"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button 
              onClick={onCreateGroup}
              size="sm"
            >
              Configure & Create
            </Button>
          </div>
        </div>

        {/* Metrics badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {selectedCount} of {totalCount} selected
          </Badge>
          
          {mode === 'org_sector' ? (
            <>
              {suggestion.organization && (
                <Badge variant="outline" className="text-xs">
                  <Building className="h-3 w-3 mr-1" />
                  {suggestion.organization}
                </Badge>
              )}
              {suggestion.focusArea ? (
                <Badge variant="outline" className="text-xs font-medium">
                  {suggestion.focusArea}
                </Badge>
              ) : suggestion.sector ? (
                <Badge variant="outline" className="text-xs">
                  {suggestion.sector}
                </Badge>
              ) : null}
            </>
          ) : (
            <>
              <Badge variant="secondary" className="text-xs">
                <Mail className="h-3 w-3 mr-1" />
                {suggestion.interactionCount} emails
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Last: {format(new Date(suggestion.lastInteraction!), 'MMM d, yyyy')}
              </Badge>
            </>
          )}
          
          <Badge className={confidenceColor}>
            {suggestion.confidence} confidence
          </Badge>
        </div>

        {/* Members with selection */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {mode === 'org_sector' ? 'Members & Focus Areas:' : 'Members:'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selectedCount === totalCount) {
                  onDeselectAll();
                } else {
                  onSelectAll();
                }
              }}
              className="h-6 text-xs"
            >
              {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          {mode === 'org_sector' ? (
            suggestion.members.map((member, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs border-l-2 border-primary/20 pl-3 py-1">
                <Checkbox
                  checked={effectiveSelection.has(member.email)}
                  onCheckedChange={() => onMemberToggle(member.email)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium">{member.name || member.email}</div>
                  <div className="text-muted-foreground">{member.email}</div>
                  {member.focusAreas && member.focusAreas.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {member.focusAreas.map((fa, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {fa}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="space-y-1">
                {suggestion.members.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs py-1">
                    <Checkbox
                      checked={effectiveSelection.has(member.email)}
                      onCheckedChange={() => onMemberToggle(member.email)}
                    />
                    <span className="font-medium">{member.name || member.email}</span>
                    <span className="text-muted-foreground">({member.email})</span>
                  </div>
                ))}
              </div>

              {/* Sample email subjects */}
              {suggestion.sampleSubjects && suggestion.sampleSubjects.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Sample email subjects:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {suggestion.sampleSubjects.slice(0, 3).map((subject, idx) => (
                      <li key={idx} className="truncate">• {subject}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
