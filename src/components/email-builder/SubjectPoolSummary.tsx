import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2 } from "lucide-react";

interface SubjectPoolSummaryProps {
  selectedCount: number;
  style: 'casual' | 'hybrid' | 'formal';
  onConfigure: () => void;
  disabled?: boolean;
}

export function SubjectPoolSummary({
  selectedCount,
  style,
  onConfigure,
  disabled
}: SubjectPoolSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Subject Line Pool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {selectedCount} subject{selectedCount !== 1 ? 's' : ''} selected
            </p>
            <Badge variant="secondary" className="text-xs">
              {style}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigure}
            disabled={disabled}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
