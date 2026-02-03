import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Plus, Link2, Loader2, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllOpportunities } from '@/hooks/useAllOpportunitiesSearch';
import { useLinkContactToOpportunity } from '@/hooks/useLinkContactToOpportunity';
import { AddOpportunityDialog } from '@/components/opportunities/AddOpportunityDialog';

interface OpportunityInfo {
  name: string;
  ownershipType?: string;
}

interface ContactOpportunitiesSectionProps {
  contactId: string;
  contactFullName: string;
  opportunities: OpportunityInfo[];
  isLoading: boolean;
  error?: Error | null;
}

export function ContactOpportunitiesSection({
  contactId,
  contactFullName,
  opportunities,
  isLoading,
  error,
}: ContactOpportunitiesSectionProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOppId, setSelectedOppId] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allOpportunities = [], isLoading: isLoadingOpps } = useAllOpportunities(linkModalOpen);
  const { linkContact, isLinking } = useLinkContactToOpportunity();

  const handleLinkContact = () => {
    if (!selectedOppId) return;

    linkContact(
      {
        opportunityId: selectedOppId,
        contactId,
        contactFullName,
        slot: selectedSlot,
      },
      {
        onSuccess: () => {
          setLinkModalOpen(false);
          setSelectedOppId('');
          setSelectedSlot(1);
        },
      }
    );
  };

  // Filter opportunities based on search and availability
  const filteredOpportunities = allOpportunities.filter((opp) => {
    const matchesSearch = opp.deal_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const selectedOpp = allOpportunities.find((o) => o.id === selectedOppId);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Opportunities (as Deal Source)</Label>

      {/* Current opportunities */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Failed to load opportunities</p>
      ) : opportunities.length > 0 ? (
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <div
              key={opp.name}
              className="p-3 border rounded-lg flex items-center justify-between bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{opp.name}</p>
                  {opp.ownershipType && (
                    <p className="text-xs text-muted-foreground">{opp.ownershipType}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground border rounded-lg border-dashed">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No opportunities found as deal source</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setLinkModalOpen(true)}
        >
          <Link2 className="h-3 w-3" />
          Link to Opportunity
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus className="h-3 w-3" />
          Create Opportunity
        </Button>
      </div>

      {/* Link to Opportunity Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Contact to Opportunity</DialogTitle>
            <DialogDescription>
              Select an opportunity to link {contactFullName} as a deal source
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Search Opportunities</Label>
              <Command className="border rounded-md">
                <CommandInput
                  placeholder="Search by deal name..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList className="max-h-48">
                  {isLoadingOpps ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : filteredOpportunities.length === 0 ? (
                    <CommandEmpty>No opportunities found</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredOpportunities.map((opp) => (
                        <CommandItem
                          key={opp.id}
                          value={opp.deal_name || ''}
                          onSelect={() => setSelectedOppId(opp.id)}
                          className={selectedOppId === opp.id ? 'bg-accent' : ''}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{opp.deal_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {opp.sector || 'No sector'} • {opp.status || 'No status'}
                            </p>
                          </div>
                          {(opp.deal_source_individual_1 || opp.deal_source_individual_2) && (
                            <Badge variant="outline" className="text-[10px]">
                              Has source
                            </Badge>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </div>

            {selectedOpp && (
              <div className="space-y-2">
                <Label>Deal Source Slot</Label>
                <Select
                  value={String(selectedSlot)}
                  onValueChange={(v) => setSelectedSlot(Number(v) as 1 | 2)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      Deal Source 1{' '}
                      {selectedOpp.deal_source_individual_1 && (
                        <span className="text-muted-foreground">
                          (currently: {selectedOpp.deal_source_individual_1})
                        </span>
                      )}
                    </SelectItem>
                    <SelectItem value="2">
                      Deal Source 2{' '}
                      {selectedOpp.deal_source_individual_2 && (
                        <span className="text-muted-foreground">
                          (currently: {selectedOpp.deal_source_individual_2})
                        </span>
                      )}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {((selectedSlot === 1 && selectedOpp.deal_source_individual_1) ||
                  (selectedSlot === 2 && selectedOpp.deal_source_individual_2)) && (
                  <p className="text-xs text-amber-600">
                    ⚠️ This will replace the existing deal source
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setLinkModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLinkContact} disabled={!selectedOppId || isLinking}>
                {isLinking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  'Link Contact'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Opportunity Modal - Pre-fill with this contact */}
      {createModalOpen && (
        <AddOpportunityDialog
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onOpportunityAdded={() => setCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
