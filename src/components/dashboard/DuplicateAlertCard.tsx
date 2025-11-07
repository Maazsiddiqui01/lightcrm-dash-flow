import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DuplicateAlertCardProps {
  count: number;
  highPriorityCount: number;
  onViewClick: () => void;
}

export function DuplicateAlertCard({
  count,
  highPriorityCount,
  onViewClick,
}: DuplicateAlertCardProps) {
  if (count === 0) return null;

  return (
    <Card className="border-warning bg-warning/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          Duplicate Contacts Detected
        </CardTitle>
        {highPriorityCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {highPriorityCount} High Priority
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-sm text-muted-foreground">
              potential {count === 1 ? 'duplicate' : 'duplicates'} found
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Review and merge to keep data clean</span>
          </div>

          <Button 
            onClick={onViewClick} 
            className="w-full"
            variant="outline"
          >
            Review Duplicates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
