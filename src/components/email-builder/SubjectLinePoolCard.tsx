import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SubjectLinePoolCardProps {
  selectedCount: number;
  totalCount: number;
  previewItems: string[];
  onConfigure: () => void;
}

export function SubjectLinePoolCard({
  selectedCount,
  totalCount,
  previewItems,
  onConfigure,
}: SubjectLinePoolCardProps) {
  const hasWarning = selectedCount === 0;
  
  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Title & Badge */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Subject Line Pool</span>
              <Badge variant="secondary" className="text-xs">
                Always On
              </Badge>
              {hasWarning && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Enable at least one subject line</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {/* Selection Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {selectedCount} of {totalCount} enabled
              </span>
              {previewItems.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {previewItems.slice(0, 3).map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {item.length > 30 ? `${item.substring(0, 30)}...` : item}
                      </Badge>
                    ))}
                    {previewItems.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{previewItems.length - 3} more
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Configure Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onConfigure}
            className="ml-2"
            aria-label="Configure Subject Line Pool"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
