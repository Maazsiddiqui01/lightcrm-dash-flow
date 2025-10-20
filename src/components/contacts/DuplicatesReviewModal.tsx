import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Users, Mail, Calendar, Check, AlertTriangle, Merge, ShieldCheck } from 'lucide-react';
import { useFuzzyDuplicates } from '@/hooks/useFuzzyDuplicates';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DuplicatesReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicatesReviewModal({ open, onOpenChange }: DuplicatesReviewModalProps) {
  const { duplicates, isScanning, isMerging, isDismissing, scanForDuplicates, mergeDuplicates, dismissDuplicates } = useFuzzyDuplicates();
  const [selectedPrimary, setSelectedPrimary] = useState<Record<string, string>>({});
  const [processedGroups, setProcessedGroups] = useState<Set<string>>(new Set());

  const handleScan = () => {
    scanForDuplicates();
  };

  const handleMerge = (groupId: string) => {
    const primaryId = selectedPrimary[groupId];
    if (!primaryId) return;

    mergeDuplicates(
      { groupId, primaryId },
      {
        onSuccess: () => {
          setProcessedGroups(prev => new Set(prev).add(groupId));
        },
      }
    );
  };

  const handleDismiss = (groupId: string) => {
    dismissDuplicates(groupId, {
      onSuccess: () => {
        setProcessedGroups(prev => new Set(prev).add(groupId));
      },
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 95) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">High ({confidence}%)</Badge>;
    } else if (confidence >= 85) {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Medium ({confidence}%)</Badge>;
    } else {
      return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Low ({confidence}%)</Badge>;
    }
  };

  const groupedDuplicates = {
    high: duplicates?.groups.filter(g => g.confidence >= 95) || [],
    medium: duplicates?.groups.filter(g => g.confidence >= 85 && g.confidence < 95) || [],
    low: duplicates?.groups.filter(g => g.confidence >= 70 && g.confidence < 85) || [],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Detect & Merge Duplicate Contacts
          </DialogTitle>
          <DialogDescription>
            AI-powered duplicate detection with human-in-the-loop approval
          </DialogDescription>
        </DialogHeader>

        {!duplicates && !isScanning && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertTriangle className="h-16 w-16 text-amber-500/50" />
            <p className="text-muted-foreground text-center max-w-md">
              Scan your contacts to find potential duplicates based on name similarity, email domains, and organizations
            </p>
            <Button onClick={handleScan} size="lg" className="gap-2">
              <Merge className="h-4 w-4" />
              Start Duplicate Scan
            </Button>
          </div>
        )}

        {isScanning && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing contacts for duplicates...</p>
          </div>
        )}

        {duplicates && duplicates.groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Check className="h-16 w-16 text-emerald-500" />
            <p className="text-lg font-semibold">No duplicates found!</p>
            <p className="text-muted-foreground">Your contacts are clean</p>
            <Button onClick={handleScan} variant="outline">
              Scan Again
            </Button>
          </div>
        )}

        {duplicates && duplicates.groups.length > 0 && (
          <ScrollArea className="max-h-[calc(90vh-200px)]">
            <div className="space-y-6 pr-4">
              {groupedDuplicates.high.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    High Confidence ({groupedDuplicates.high.length})
                  </h3>
                  <div className="space-y-4">
                    {groupedDuplicates.high.map(group => (
                      <DuplicateGroupCard
                        key={group.id}
                        group={group}
                        isProcessed={processedGroups.has(group.id)}
                        isMerging={isMerging}
                        isDismissing={isDismissing}
                        selectedPrimary={selectedPrimary[group.id] || group.suggestedPrimary}
                        onSelectPrimary={(id) => setSelectedPrimary(prev => ({ ...prev, [group.id]: id }))}
                        onMerge={() => handleMerge(group.id)}
                        onDismiss={() => handleDismiss(group.id)}
                        getConfidenceBadge={getConfidenceBadge}
                      />
                    ))}
                  </div>
                </div>
              )}

              {groupedDuplicates.medium.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-amber-600 dark:text-amber-400">
                      Medium Confidence ({groupedDuplicates.medium.length})
                    </h3>
                    <div className="space-y-4">
                      {groupedDuplicates.medium.map(group => (
                        <DuplicateGroupCard
                          key={group.id}
                          group={group}
                          isProcessed={processedGroups.has(group.id)}
                          isMerging={isMerging}
                          isDismissing={isDismissing}
                          selectedPrimary={selectedPrimary[group.id] || group.suggestedPrimary}
                          onSelectPrimary={(id) => setSelectedPrimary(prev => ({ ...prev, [group.id]: id }))}
                          onMerge={() => handleMerge(group.id)}
                          onDismiss={() => handleDismiss(group.id)}
                          getConfidenceBadge={getConfidenceBadge}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {groupedDuplicates.low.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                      Low Confidence ({groupedDuplicates.low.length})
                    </h3>
                    <div className="space-y-4">
                      {groupedDuplicates.low.map(group => (
                        <DuplicateGroupCard
                          key={group.id}
                          group={group}
                          isProcessed={processedGroups.has(group.id)}
                          isMerging={isMerging}
                          isDismissing={isDismissing}
                          selectedPrimary={selectedPrimary[group.id] || group.suggestedPrimary}
                          onSelectPrimary={(id) => setSelectedPrimary(prev => ({ ...prev, [group.id]: id }))}
                          onMerge={() => handleMerge(group.id)}
                          onDismiss={() => handleDismiss(group.id)}
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

        {duplicates && duplicates.groups.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Found {duplicates.groups.length} potential duplicate group{duplicates.groups.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={handleScan} variant="outline" size="sm">
              Refresh Scan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DuplicateGroupCardProps {
  group: any;
  isProcessed: boolean;
  isMerging: boolean;
  isDismissing: boolean;
  selectedPrimary: string;
  onSelectPrimary: (id: string) => void;
  onMerge: () => void;
  onDismiss: () => void;
  getConfidenceBadge: (confidence: number) => JSX.Element;
}

function DuplicateGroupCard({
  group,
  isProcessed,
  isMerging,
  isDismissing,
  selectedPrimary,
  onSelectPrimary,
  onMerge,
  onDismiss,
  getConfidenceBadge,
}: DuplicateGroupCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getConfidenceBadge(group.confidence)}
            <Badge variant="outline" className="text-xs">
              {group.records.length} contacts
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{group.matchReason}</p>
          {group.suggestedReason && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Recommended: {group.suggestedReason}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {isProcessed ? (
            <Button size="sm" variant="outline" disabled className="gap-1">
              <Check className="h-4 w-4" />
              Processed
            </Button>
          ) : (
            <>
              <Button 
                size="sm" 
                onClick={onMerge}
                disabled={isMerging || isDismissing || !selectedPrimary}
                className="gap-1"
              >
                {isMerging ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Merge className="h-4 w-4" />
                    Approve
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onDismiss}
                disabled={isMerging || isDismissing}
                className="gap-1"
              >
                {isDismissing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    Dismiss
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <RadioGroup value={selectedPrimary} onValueChange={onSelectPrimary}>
        <div className="space-y-2">
          {group.records.map((record: any, idx: number) => (
            <div
              key={record.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-md border transition-colors",
                selectedPrimary === record.id ? "bg-primary/5 border-primary" : "bg-muted/30"
              )}
            >
              <RadioGroupItem value={record.id} id={`${group.id}-${record.id}`} className="mt-1" />
              <Label 
                htmlFor={`${group.id}-${record.id}`}
                className="flex-1 cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-medium">{record.full_name}</div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="font-medium">{record.email}</span>
                        {record.all_emails && record.all_emails.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            +{record.all_emails.length - 1} more
                          </Badge>
                        )}
                      </div>
                      {record.all_emails && record.all_emails.length > 1 && (
                        <div className="ml-5 text-xs space-y-0.5">
                          {record.all_emails.slice(1).map((email: string, i: number) => (
                            <div key={i}>{email}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    {record.organization && (
                      <div className="text-sm text-muted-foreground">
                        {record.organization}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 text-right">
                    {record.most_recent_contact && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(record.most_recent_contact), { addSuffix: true })}
                      </div>
                    )}
                    <div>
                      {record.emails_count} emails, {record.meetings_count} meetings
                    </div>
                  </div>
                </div>
                {idx === 0 && record.id === group.suggestedPrimary && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Recommended
                  </Badge>
                )}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
        <p className="font-medium mb-1">What happens when you approve:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Primary contact keeps all data + gets all email addresses from duplicates</li>
          <li>All opportunities, notes, and interactions linked to primary</li>
          <li>Duplicate contacts permanently deleted</li>
        </ul>
        <p className="font-medium mt-2 mb-1">What happens when you dismiss:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>These contacts won't be flagged as duplicates in future scans</li>
          <li>No data will be changed or deleted</li>
        </ul>
      </div>
    </div>
  );
}
