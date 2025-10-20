import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useSuggestGroups, type GroupSuggestion, type SuggestionMode } from '@/hooks/useSuggestGroups';
import { GroupConfigModal } from './GroupConfigModal';
import { Loader2, Users, Mail, Calendar, Sparkles, Building, Activity } from 'lucide-react';
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

  const handleCreateGroup = (suggestion: GroupSuggestion) => {
    setSelectedSuggestion(suggestion);
    setConfigModalOpen(true);
  };

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
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Users className="h-16 w-16 text-muted-foreground" />
              <p className="text-lg font-medium">No Suggestions Found</p>
              <p className="text-sm text-muted-foreground">
                {mode === 'org_sector' 
                  ? 'No groups with 2+ members from the same organization and sector were found'
                  : 'No interaction patterns detected for grouping'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {suggestions.length} suggested group{suggestions.length !== 1 ? 's' : ''}
                </p>
                <Button onClick={() => analyzeSuggestions()} disabled={isPending} size="sm" variant="outline">
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Re-analyze
                </Button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    mode={mode}
                    onCreateGroup={() => handleCreateGroup(suggestion)}
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
          organization={selectedSuggestion.organization}
        />
      )}
    </>
  );
}

interface SuggestionCardProps {
  suggestion: GroupSuggestion;
  mode: SuggestionMode;
  onCreateGroup: () => void;
}

function SuggestionCard({ suggestion, mode, onCreateGroup }: SuggestionCardProps) {
  const confidenceColor = {
    high: 'bg-green-500/10 text-green-700 dark:text-green-400',
    medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    low: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  }[suggestion.confidence];

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Header with name and actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{suggestion.suggestedName}</h3>
          </div>
          
          <Button 
            onClick={onCreateGroup}
            size="sm"
          >
            Configure & Create
          </Button>
        </div>

        {/* Metrics badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {suggestion.members.length} members
          </Badge>
          
          {mode === 'org_sector' ? (
            <>
              {suggestion.organization && (
                <Badge variant="outline" className="text-xs">
                  <Building className="h-3 w-3 mr-1" />
                  {suggestion.organization}
                </Badge>
              )}
              {suggestion.sector && (
                <Badge variant="outline" className="text-xs">
                  {suggestion.sector}
                </Badge>
              )}
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

        {/* Members with focus areas */}
        {mode === 'org_sector' ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Members & Focus Areas:</p>
            {suggestion.members.map((member, idx) => (
              <div key={idx} className="text-xs border-l-2 border-primary/20 pl-3 py-1">
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
            ))}
          </div>
        ) : (
          <>
            {/* Member list for interaction mode */}
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Members:</p>
              <div className="flex flex-wrap gap-1">
                {suggestion.members.map((member, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {member.name || member.email}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sample email subjects */}
            {suggestion.sampleSubjects && suggestion.sampleSubjects.length > 0 && (
              <div className="mt-3 pt-3 border-t">
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
    </Card>
  );
}
