import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuggestGroups, type GroupSuggestion as EdgeGroupSuggestion, type SuggestionMode } from '@/hooks/useSuggestGroups';
import { useGroupSuggestions, useBulkSaveGroupSuggestions, useUpdateSuggestionStatus } from '@/hooks/useGroupSuggestions';
import type { SuggestionStatus, GroupMember } from '@/types/groupSuggestion';
import { GroupConfigModal } from './GroupConfigModal';
import { Loader2, Users, Mail, Calendar, Sparkles, Building, Activity, X, Check, RotateCcw } from 'lucide-react';
import { fetchDismissedSuggestionIds } from '@/hooks/useDismissedSuggestionIds';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SuggestGroupsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestGroupsModal({ open, onOpenChange }: SuggestGroupsModalProps) {
  const [mode, setMode] = useState<SuggestionMode>('org_sector');
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'all'>('pending');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  
  const { mutate: analyzeSuggestions, isPending: isAnalyzing } = useSuggestGroups(mode);
  const { data: persistedSuggestions, isLoading: isLoadingPersisted } = useGroupSuggestions(mode, statusFilter);
  const { mutateAsync: bulkSaveSuggestions } = useBulkSaveGroupSuggestions();
  const { mutateAsync: updateStatus } = useUpdateSuggestionStatus();
  
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<EdgeGroupSuggestion | null>(null);
  const [memberSelections, setMemberSelections] = useState<Record<string, Set<string>>>({});

  // Initialize member selections from persisted suggestions
  useEffect(() => {
    if (!persistedSuggestions) return;
    
    setMemberSelections(prev => {
      const next = { ...prev };
      for (const suggestion of persistedSuggestions) {
        if (!next[suggestion.suggestion_id]) {
          next[suggestion.suggestion_id] = new Set(suggestion.members.map(m => m.email_address));
        }
      }
      return next;
    });
  }, [persistedSuggestions]);

  const handleStartAnalysis = async () => {
    analyzeSuggestions(undefined, {
      onSuccess: async (freshSuggestions: EdgeGroupSuggestion[]) => {
        // Fetch dismissed suggestion IDs to filter them out
        const dismissedIds = await fetchDismissedSuggestionIds(mode);
        
        // Filter out previously dismissed suggestions
        const newSuggestions = freshSuggestions.filter(
          s => !dismissedIds.has(s.suggestion_id)
        );
        
        const dismissedCount = freshSuggestions.length - newSuggestions.length;
        
        if (newSuggestions.length === 0) {
          if (dismissedCount > 0) {
            toast.info(`No new suggestions found. ${dismissedCount} previously dismissed suggestion${dismissedCount > 1 ? 's were' : ' was'} skipped.`);
          }
          setHasAnalyzed(true);
          return;
        }
        
        // Convert edge function suggestions to database format
        const suggestionsToSave = newSuggestions.map(s => ({
          suggestion_id: s.suggestion_id,
          mode,
          suggested_name: s.suggestedName,
          members: s.members.map(m => ({
            contact_id: m.contactId || '',
            full_name: m.name || '',
            email_address: m.email,
            organization: m.organization || null,
            sector: null,
            title: null,
            focus_areas: m.focusAreas || []
          })) as GroupMember[],
          metadata: {
            organization: s.organization,
            sector: s.sector,
            focusArea: s.focusArea,
            interactionCount: s.interactionCount,
            confidence: s.confidence === 'high' ? 0.8 : s.confidence === 'medium' ? 0.6 : 0.4,
          },
          status: 'pending' as SuggestionStatus,
        }));

        await bulkSaveSuggestions(suggestionsToSave);
        
        if (dismissedCount > 0) {
          toast.success(`Found ${newSuggestions.length} new suggestion${newSuggestions.length > 1 ? 's' : ''}. ${dismissedCount} previously dismissed ${dismissedCount > 1 ? 'were' : 'was'} skipped.`);
        }
        
        setHasAnalyzed(true);
      },
    });
  };

  const handleCreateGroup = (suggestion: EdgeGroupSuggestion) => {
    const selectedMembers = memberSelections[suggestion.suggestion_id];
    const membersToInclude = selectedMembers
      ? suggestion.members.filter(m => selectedMembers.has(m.email))
      : suggestion.members;
    
    setSelectedSuggestion({
      ...suggestion,
      members: membersToInclude
    });
    setConfigModalOpen(true);
  };

  const handleDismiss = async (suggestionId: string) => {
    await updateStatus({
      suggestionId,
      status: 'dismissed',
    });
  };

  const handleRestore = async (suggestionId: string) => {
    await updateStatus({
      suggestionId,
      status: 'pending',
    });
  };

  const handleGroupCreated = async (suggestionId: string, groupId: string) => {
    await updateStatus({
      suggestionId,
      status: 'approved',
      groupId,
    });
  };

  const handleMemberToggle = (suggestionId: string, memberEmail: string, checked: boolean) => {
    setMemberSelections(prev => {
      const current = new Set(prev[suggestionId] || []);
      if (checked) {
        current.add(memberEmail);
      } else {
        current.delete(memberEmail);
      }
      return {
        ...prev,
        [suggestionId]: current
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

  // Convert persisted suggestions to edge format for display
  const displaySuggestions: EdgeGroupSuggestion[] = (persistedSuggestions || []).map(ps => ({
    suggestion_id: ps.suggestion_id,
    id: ps.suggestion_id,
    suggestedName: ps.suggested_name,
    members: ps.members.map(m => ({
      email: m.email_address,
      name: m.full_name,
      contactId: m.contact_id,
      organization: m.organization || undefined,
      focusAreas: m.focus_areas || []
    })),
    organization: ps.metadata.organization,
    sector: ps.metadata.sector,
    focusArea: ps.metadata.focusArea,
    interactionCount: ps.metadata.interactionCount,
    confidence: ps.metadata.confidence && ps.metadata.confidence >= 0.7 ? 'high' : 
                ps.metadata.confidence && ps.metadata.confidence >= 0.5 ? 'medium' : 'low',
    status: ps.status,
  }));

  // Sort: pending first, then dismissed, then approved
  const sortedSuggestions = [...displaySuggestions].sort((a, b) => {
    const statusOrder: Record<string, number> = { pending: 0, dismissed: 1, approved: 2 };
    const aStatus = (a as any).status || 'pending';
    const bStatus = (b as any).status || 'pending';
    return statusOrder[aStatus] - statusOrder[bStatus];
  });

  const showInitialState = !hasAnalyzed && (!persistedSuggestions || persistedSuggestions.length === 0);

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

          {showInitialState ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 mb-4 w-full max-w-md">
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
              <Button onClick={handleStartAnalysis} disabled={isAnalyzing} size="lg">
                {isAnalyzing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Start Analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SuggestionStatus | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button onClick={handleStartAnalysis} disabled={isAnalyzing} size="sm" variant="outline">
                    {isAnalyzing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Re-analyze
                  </Button>
                </div>
              </div>

              {isLoadingPersisted ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sortedSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Users className="h-16 w-16 text-muted-foreground" />
                  <p className="text-lg font-medium">No Suggestions Found</p>
                  <p className="text-sm text-muted-foreground">
                    {statusFilter === 'all' 
                      ? 'No group suggestions available. Click "Re-analyze" to find new groups.'
                      : `No ${statusFilter} suggestions found. Try changing the filter.`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sortedSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.suggestion_id}
                      suggestion={suggestion}
                      mode={mode}
                      selectedMembers={memberSelections[suggestion.suggestion_id] || new Set()}
                      onCreateGroup={() => handleCreateGroup(suggestion)}
                      onDismiss={() => handleDismiss(suggestion.suggestion_id)}
                      onRestore={() => handleRestore(suggestion.suggestion_id)}
                      onMemberToggle={(email, checked) => handleMemberToggle(suggestion.suggestion_id, email, checked)}
                      onSelectAll={() => handleSelectAll(suggestion.suggestion_id, suggestion.members.map(m => m.email))}
                      onDeselectAll={() => handleDeselectAll(suggestion.suggestion_id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group Configuration Modal */}
      {selectedSuggestion && (
        <GroupConfigModal
          key={selectedSuggestion.suggestion_id}
          open={configModalOpen}
          onOpenChange={(open) => {
            setConfigModalOpen(open);
            if (!open) {
              setSelectedSuggestion(null);
            }
          }}
          suggestedName={selectedSuggestion.suggestedName}
          members={selectedSuggestion.members.map(m => ({
            contactId: m.contactId!,
            email: m.email,
            name: m.name || m.email
          }))}
          sector={selectedSuggestion.sector}
          focusArea={selectedSuggestion.focusArea}
          organization={selectedSuggestion.organization}
          suggestionId={selectedSuggestion.suggestion_id}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </>
  );
}

interface SuggestionCardProps {
  suggestion: EdgeGroupSuggestion & { status?: SuggestionStatus };
  mode: SuggestionMode;
  selectedMembers: Set<string>;
  onCreateGroup: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  onMemberToggle: (email: string, checked: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

function SuggestionCard({ 
  suggestion, 
  mode, 
  selectedMembers, 
  onCreateGroup, 
  onDismiss,
  onRestore, 
  onMemberToggle, 
  onSelectAll, 
  onDeselectAll 
}: SuggestionCardProps) {
  const selectedCount = selectedMembers.size;
  const totalCount = suggestion.members.length;
  const status = suggestion.status || 'pending';
  
  const confidenceColor = {
    high: 'bg-green-500/10 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    low: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  }[suggestion.confidence];

  return (
    <Card className={`p-4 ${status === 'dismissed' ? 'opacity-60' : ''}`}>
      <div className="space-y-3">
        {/* Header with name, status badge, and actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <h3 className="font-medium truncate">{suggestion.suggestedName}</h3>
            {status === 'approved' && (
              <Badge variant="default" className="text-xs shrink-0">
                <Check className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            )}
            {status === 'dismissed' && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <X className="h-3 w-3 mr-1" />
                Dismissed
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {status === 'pending' && (
              <>
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
                  disabled={selectedCount === 0}
                >
                  Configure & Create
                </Button>
              </>
            )}
            {status === 'dismissed' && (
              <Button 
                onClick={onRestore}
                size="sm"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
            )}
            {status === 'approved' && (
              <Badge variant="outline" className="text-xs">
                ✓ Group Created
              </Badge>
            )}
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
              {suggestion.interactionCount && (
                <Badge variant="secondary" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  {suggestion.interactionCount} emails
                </Badge>
              )}
              {suggestion.lastInteraction && (
                <Badge variant="secondary" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  Last: {format(new Date(suggestion.lastInteraction), 'MMM d, yyyy')}
                </Badge>
              )}
            </>
          )}
          
          <Badge className={confidenceColor}>
            {suggestion.confidence} confidence
          </Badge>
        </div>

        {/* Members with selection - only show for pending status */}
        {status === 'pending' && (
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
              suggestion.members.map((member) => (
                <div key={member.email} className="flex items-start gap-2 text-xs border-l-2 border-primary/20 pl-3 py-1">
                  <Checkbox
                    checked={selectedMembers.has(member.email)}
                    onCheckedChange={(v) => onMemberToggle(member.email, Boolean(v))}
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
              <div className="space-y-1">
                {suggestion.members.map((member) => (
                  <div key={member.email} className="flex items-center gap-2 text-xs py-1">
                    <Checkbox
                      checked={selectedMembers.has(member.email)}
                      onCheckedChange={(v) => onMemberToggle(member.email, Boolean(v))}
                    />
                    <span className="font-medium">{member.name || member.email}</span>
                    <span className="text-muted-foreground">({member.email})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
