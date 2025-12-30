import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSuggestGroups, type GroupSuggestion as EdgeGroupSuggestion, type SuggestionMode } from '@/hooks/useSuggestGroups';
import { useGroupSuggestions, useBulkSaveGroupSuggestions, useUpdateSuggestionStatus } from '@/hooks/useGroupSuggestions';
import { useGroupSuggestionCounts, type SuggestionCounts } from '@/hooks/useGroupSuggestionCounts';
import { useGroups } from '@/hooks/useGroups';
import { useSearchContactsExcludingIds, type ContactSearchResult } from '@/hooks/useSearchContactsExcludingIds';
import type { SuggestionStatus, GroupMember } from '@/types/groupSuggestion';
import { GroupConfigModal } from './GroupConfigModal';
import { Loader2, Users, Mail, Calendar, Sparkles, Building, Activity, X, Check, RotateCcw, ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
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
  const { data: counts } = useGroupSuggestionCounts(mode);
  const { data: manualGroups } = useGroups();
  const { mutateAsync: bulkSaveSuggestions } = useBulkSaveGroupSuggestions();
  const { mutateAsync: updateStatus } = useUpdateSuggestionStatus();
  
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<EdgeGroupSuggestion | null>(null);
  const [memberSelections, setMemberSelections] = useState<Record<string, Set<string>>>({});
  const [addedMembers, setAddedMembers] = useState<Record<string, ContactSearchResult[]>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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
    const added = addedMembers[suggestion.suggestion_id] || [];
    
    // Combine original selected members with added members
    const originalMembers = selectedMembers
      ? suggestion.members.filter(m => selectedMembers.has(m.email))
      : suggestion.members;
    
    const addedAsMembers = added.map(c => ({
      email: c.email_address || '',
      name: c.full_name || c.email_address || '',
      contactId: c.id,
      organization: c.organization || undefined,
      focusAreas: [] as string[]
    }));
    
    setSelectedSuggestion({
      ...suggestion,
      members: [...originalMembers, ...addedAsMembers]
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

  const handleAddMember = (suggestionId: string, contact: ContactSearchResult) => {
    setAddedMembers(prev => {
      const current = prev[suggestionId] || [];
      // Don't add duplicates
      if (current.some(c => c.id === contact.id)) return prev;
      return {
        ...prev,
        [suggestionId]: [...current, contact]
      };
    });
  };

  const handleRemoveAddedMember = (suggestionId: string, contactId: string) => {
    setAddedMembers(prev => {
      const current = prev[suggestionId] || [];
      return {
        ...prev,
        [suggestionId]: current.filter(c => c.id !== contactId)
      };
    });
  };

  const toggleCardExpanded = (suggestionId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(suggestionId)) {
        next.delete(suggestionId);
      } else {
        next.add(suggestionId);
      }
      return next;
    });
  };

  // Convert persisted suggestions to edge format for display
  const displaySuggestions: (EdgeGroupSuggestion & { status?: SuggestionStatus })[] = (persistedSuggestions || []).map(ps => ({
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

  // Create manual group entries for approved filter
  const manualGroupEntries: (EdgeGroupSuggestion & { status?: SuggestionStatus; isManualGroup?: boolean })[] = 
    (statusFilter === 'approved' || statusFilter === 'all') && manualGroups 
      ? manualGroups.map(g => ({
          suggestion_id: `manual_${g.id}`,
          id: `manual_${g.id}`,
          suggestedName: g.name,
          members: [],
          organization: undefined,
          sector: g.sector || undefined,
          focusArea: g.focus_area || undefined,
          confidence: 'high' as const,
          status: 'approved' as SuggestionStatus,
          isManualGroup: true,
        }))
      : [];

  // Combine suggestions with manual groups
  const allItems = [...displaySuggestions, ...manualGroupEntries];

  // Sort: pending first, then dismissed, then approved
  const sortedSuggestions = [...allItems].sort((a, b) => {
    const statusOrder: Record<string, number> = { pending: 0, dismissed: 1, approved: 2 };
    const aStatus = a.status || 'pending';
    const bStatus = b.status || 'pending';
    return statusOrder[aStatus] - statusOrder[bStatus];
  });

  const showInitialState = !hasAnalyzed && (!persistedSuggestions || persistedSuggestions.length === 0);

  // Calculate total approved including manual groups
  const manualGroupCount = manualGroups?.length || 0;
  const totalApproved = (counts?.approved || 0) + manualGroupCount;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
              {/* Counts Summary Header */}
              <CountsSummary 
                counts={counts} 
                manualGroupCount={manualGroupCount}
                currentFilter={statusFilter}
                onFilterChange={setStatusFilter}
              />

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
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {sortedSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.suggestion_id}
                      suggestion={suggestion}
                      mode={mode}
                      isExpanded={expandedCards.has(suggestion.suggestion_id)}
                      onToggleExpand={() => toggleCardExpanded(suggestion.suggestion_id)}
                      selectedMembers={memberSelections[suggestion.suggestion_id] || new Set()}
                      addedMembers={addedMembers[suggestion.suggestion_id] || []}
                      onCreateGroup={() => handleCreateGroup(suggestion)}
                      onDismiss={() => handleDismiss(suggestion.suggestion_id)}
                      onRestore={() => handleRestore(suggestion.suggestion_id)}
                      onMemberToggle={(email, checked) => handleMemberToggle(suggestion.suggestion_id, email, checked)}
                      onSelectAll={() => handleSelectAll(suggestion.suggestion_id, suggestion.members.map(m => m.email))}
                      onDeselectAll={() => handleDeselectAll(suggestion.suggestion_id)}
                      onAddMember={(contact) => handleAddMember(suggestion.suggestion_id, contact)}
                      onRemoveAddedMember={(contactId) => handleRemoveAddedMember(suggestion.suggestion_id, contactId)}
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

// Counts Summary Component
interface CountsSummaryProps {
  counts: SuggestionCounts | undefined;
  manualGroupCount: number;
  currentFilter: SuggestionStatus | 'all';
  onFilterChange: (filter: SuggestionStatus | 'all') => void;
}

function CountsSummary({ counts, manualGroupCount, currentFilter, onFilterChange }: CountsSummaryProps) {
  const total = (counts?.total || 0) + manualGroupCount;
  const pending = counts?.pending || 0;
  const approved = (counts?.approved || 0) + manualGroupCount;
  const dismissed = counts?.dismissed || 0;

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
      <CountBadge 
        label="Total" 
        count={total} 
        active={currentFilter === 'all'}
        onClick={() => onFilterChange('all')}
      />
      <CountBadge 
        label="Pending" 
        count={pending} 
        active={currentFilter === 'pending'}
        onClick={() => onFilterChange('pending')}
        variant="warning"
      />
      <CountBadge 
        label="Approved" 
        count={approved} 
        active={currentFilter === 'approved'}
        onClick={() => onFilterChange('approved')}
        variant="success"
      />
      <CountBadge 
        label="Dismissed" 
        count={dismissed} 
        active={currentFilter === 'dismissed'}
        onClick={() => onFilterChange('dismissed')}
        variant="muted"
      />
    </div>
  );
}

interface CountBadgeProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'success' | 'warning' | 'muted';
}

function CountBadge({ label, count, active, onClick, variant = 'default' }: CountBadgeProps) {
  const variantClasses = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-700 dark:text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        active 
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background ' + variantClasses[variant]
          : 'hover:opacity-80 ' + variantClasses[variant]
      }`}
    >
      {label}: {count}
    </button>
  );
}

interface SuggestionCardProps {
  suggestion: EdgeGroupSuggestion & { status?: SuggestionStatus; isManualGroup?: boolean };
  mode: SuggestionMode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  selectedMembers: Set<string>;
  addedMembers: ContactSearchResult[];
  onCreateGroup: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  onMemberToggle: (email: string, checked: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddMember: (contact: ContactSearchResult) => void;
  onRemoveAddedMember: (contactId: string) => void;
}

function SuggestionCard({ 
  suggestion, 
  mode, 
  isExpanded,
  onToggleExpand,
  selectedMembers, 
  addedMembers,
  onCreateGroup, 
  onDismiss,
  onRestore, 
  onMemberToggle, 
  onSelectAll, 
  onDeselectAll,
  onAddMember,
  onRemoveAddedMember
}: SuggestionCardProps) {
  const selectedCount = selectedMembers.size + addedMembers.length;
  const totalCount = suggestion.members.length + addedMembers.length;
  const status = suggestion.status || 'pending';
  const isManualGroup = (suggestion as any).isManualGroup;
  
  const confidenceColor = {
    high: 'bg-green-500/10 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    low: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  }[suggestion.confidence];

  return (
    <Card className={`${status === 'dismissed' ? 'opacity-60' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        {/* Collapsed Header */}
        <div className="p-3 flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate">{suggestion.suggestedName}</h3>
            
            <Badge variant="secondary" className="text-xs shrink-0">
              <Users className="h-3 w-3 mr-1" />
              {suggestion.members.length} members
            </Badge>

            {mode === 'org_sector' && suggestion.focusArea && (
              <Badge variant="outline" className="text-xs shrink-0">
                {suggestion.focusArea}
              </Badge>
            )}

            {suggestion.sector && (
              <Badge variant="outline" className="text-xs shrink-0">
                {suggestion.sector}
              </Badge>
            )}

            {isManualGroup && (
              <Badge className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 shrink-0">
                Manually Created
              </Badge>
            )}

            {status === 'approved' && !isManualGroup && (
              <Badge variant="default" className="text-xs shrink-0">
                <Check className="h-3 w-3 mr-1" />
                From Suggestion
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
                  onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Dismiss this suggestion"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={(e) => { e.stopPropagation(); onCreateGroup(); }}
                  size="sm"
                  disabled={selectedCount === 0}
                >
                  Configure & Create
                </Button>
              </>
            )}
            {status === 'dismissed' && (
              <Button 
                onClick={(e) => { e.stopPropagation(); onRestore(); }}
                size="sm"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
            )}
            {status === 'approved' && !isManualGroup && (
              <Badge variant="outline" className="text-xs">
                ✓ Group Created
              </Badge>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t">
            {/* Confidence Badge */}
            <div className="flex flex-wrap gap-2 py-2">
              {mode === 'interaction' && suggestion.interactionCount && (
                <Badge variant="secondary" className="text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  {suggestion.interactionCount} emails
                </Badge>
              )}
              {!isManualGroup && (
                <Badge className={confidenceColor}>
                  {suggestion.confidence} confidence
                </Badge>
              )}
            </div>

            {/* Members Section - only for non-manual groups with pending status */}
            {!isManualGroup && status === 'pending' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Members ({selectedCount} of {totalCount} selected):
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedCount === suggestion.members.length) {
                        onDeselectAll();
                      } else {
                        onSelectAll();
                      }
                    }}
                    className="h-6 text-xs"
                  >
                    {selectedCount === suggestion.members.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {suggestion.members.map((member) => (
                    <div key={member.email} className="flex items-center gap-2 text-xs py-1">
                      <Checkbox
                        checked={selectedMembers.has(member.email)}
                        onCheckedChange={(v) => onMemberToggle(member.email, Boolean(v))}
                      />
                      <span className="font-medium">{member.name || member.email}</span>
                      <span className="text-muted-foreground">({member.email})</span>
                      {member.focusAreas && member.focusAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-auto">
                          {member.focusAreas.slice(0, 2).map((fa, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {fa}
                            </Badge>
                          ))}
                          {member.focusAreas.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{member.focusAreas.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Added Members */}
                  {addedMembers.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-2 text-xs py-1 bg-primary/5 rounded px-2">
                      <Badge variant="default" className="text-xs h-5">NEW</Badge>
                      <span className="font-medium">{contact.full_name || contact.email_address}</span>
                      <span className="text-muted-foreground">({contact.email_address})</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-auto"
                        onClick={() => onRemoveAddedMember(contact.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add More Members Section */}
                <AddMemberSearch 
                  excludeIds={[
                    ...suggestion.members.map(m => m.contactId || '').filter(Boolean),
                    ...addedMembers.map(c => c.id)
                  ]}
                  onAddMember={onAddMember}
                />
              </div>
            )}

            {/* For manual groups, show info */}
            {isManualGroup && (
              <p className="text-sm text-muted-foreground py-2">
                This is a manually created group. Open the Contacts page to view and manage its members.
              </p>
            )}

            {/* For approved suggestions, show summary */}
            {!isManualGroup && status === 'approved' && (
              <p className="text-sm text-muted-foreground py-2">
                This group was created from a suggestion with {suggestion.members.length} members.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Add Member Search Component
interface AddMemberSearchProps {
  excludeIds: string[];
  onAddMember: (contact: ContactSearchResult) => void;
}

function AddMemberSearch({ excludeIds, onAddMember }: AddMemberSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const { data: searchResults, isLoading } = useSearchContactsExcludingIds(
    searchTerm,
    excludeIds,
    isSearching && searchTerm.length >= 2
  );

  return (
    <div className="border-t pt-3 mt-2">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <Plus className="h-3 w-3" />
        Add More Members
      </p>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsSearching(true)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      
      {isSearching && searchTerm.length >= 2 && (
        <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 text-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            searchResults.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  onAddMember(contact);
                  setSearchTerm('');
                  setIsSearching(false);
                }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center justify-between"
              >
                <div>
                  <span className="font-medium">{contact.full_name || contact.email_address}</span>
                  {contact.full_name && (
                    <span className="text-muted-foreground ml-2">{contact.email_address}</span>
                  )}
                </div>
                <Plus className="h-3 w-3" />
              </button>
            ))
          ) : (
            <p className="p-2 text-center text-xs text-muted-foreground">No contacts found</p>
          )}
        </div>
      )}
    </div>
  );
}
