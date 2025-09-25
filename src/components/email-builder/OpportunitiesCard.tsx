import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

interface OpportunitiesCardProps {
  opportunities: Array<{ deal_name: string }>;
}

export function OpportunitiesCard({ opportunities }: OpportunitiesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {opportunities.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Top {opportunities.length} opportunities:
            </div>
            <div className="space-y-2">
              {opportunities.map((opp, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm font-medium">{opp.deal_name}</span>
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No opportunities found
          </div>
        )}
      </CardContent>
    </Card>
  );
}