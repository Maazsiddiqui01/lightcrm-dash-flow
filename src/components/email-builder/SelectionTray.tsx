import { Button } from '@/components/ui/button';
import { X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionTrayProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

export function SelectionTray({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  onGenerate,
  isGenerating = false,
}: SelectionTrayProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card border-t shadow-lg",
        "animate-in slide-in-from-bottom duration-200"
      )}
    >
      <div className="container max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-semibold text-foreground">{selectedCount}</span>
              <span className="text-muted-foreground"> contact{selectedCount !== 1 ? 's' : ''} selected</span>
            </div>
            
            {selectedCount < totalCount && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                className="text-xs"
              >
                Select all {totalCount}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>

          <Button
            onClick={onGenerate}
            disabled={selectedCount === 0 || isGenerating}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : `Generate Drafts (${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
