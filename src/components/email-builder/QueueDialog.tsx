import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Loader2, Clock, X, RotateCcw } from 'lucide-react';
import type { QueueItem } from '@/types/groupEmailBuilder';
import { cn } from '@/lib/utils';

interface QueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: Map<string, QueueItem>;
  onRetry: (contactId: string) => void;
  onCancelPending: () => void;
  isProcessing: boolean;
}

export function QueueDialog({
  open,
  onOpenChange,
  queue,
  onRetry,
  onCancelPending,
  isProcessing,
}: QueueDialogProps) {
  const items = Array.from(queue.values());
  const totalCount = items.length;
  const completedCount = items.filter(i => i.status === 'succeeded' || i.status === 'failed').length;
  const successCount = items.filter(i => i.status === 'succeeded').length;
  const failedCount = items.filter(i => i.status === 'failed').length;
  const pendingCount = items.filter(i => i.status === 'queued').length;
  
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allComplete = completedCount === totalCount;

  const getStatusIcon = (status: QueueItem['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'succeeded':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: QueueItem['status']) => {
    const variants = {
      queued: 'secondary',
      running: 'default',
      succeeded: 'default',
      failed: 'destructive',
    } as const;

    const labels = {
      queued: 'Queued',
      running: 'Running',
      succeeded: 'Done',
      failed: 'Failed',
    };

    return (
      <Badge variant={variants[status]} className={cn(
        status === 'running' && 'bg-blue-500',
        status === 'succeeded' && 'bg-green-500'
      )}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Batch Generation Progress</DialogTitle>
          <DialogDescription>
            Generating {totalCount} email draft{totalCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedCount} of {totalCount} completed
              </span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {successCount} succeeded
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" />
                {failedCount} failed
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pendingCount} pending
              </span>
            </div>
          </div>

          {/* Items List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4 space-y-2">
              {items.map((item) => (
                <div
                  key={item.contactId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.contactName}</p>
                      {item.error && (
                        <p className="text-xs text-destructive mt-1">{item.error}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    
                    {item.status === 'failed' && item.retryCount < 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetry(item.contactId)}
                        className="h-7 text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Retry ({item.retryCount}/3)
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {pendingCount > 0 && isProcessing && (
              <Button
                variant="outline"
                onClick={onCancelPending}
                className="text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Pending ({pendingCount})
              </Button>
            )}
          </div>
          
          <Button
            onClick={() => onOpenChange(false)}
            disabled={!allComplete}
            variant={allComplete ? 'default' : 'outline'}
          >
            {allComplete ? 'Close' : 'Processing...'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
