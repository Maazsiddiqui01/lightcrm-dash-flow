import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";
import { useState, useMemo } from "react";

interface Opportunity {
  id?: string;
  deal_name: string;
  ebitda_in_ms?: number | null;
  updated_at?: string | null;
}

interface OpportunitiesCardProps {
  opportunities: Opportunity[];
}

type SortOption = 'updated' | 'name' | 'ebitda';

export function OpportunitiesCard({ opportunities }: OpportunitiesCardProps) {
  const [sortBy, setSortBy] = useState<SortOption>('updated');

  const sortedOpportunities = useMemo(() => {
    if (opportunities.length === 0) return [];

    const sorted = [...opportunities];
    switch (sortBy) {
      case 'updated':
        return sorted.sort((a, b) => {
          const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return dateB - dateA; // DESC
        });
      case 'name':
        return sorted.sort((a, b) => 
          (a.deal_name || '').localeCompare(b.deal_name || '')
        );
      case 'ebitda':
        return sorted.sort((a, b) => 
          (b.ebitda_in_ms || 0) - (a.ebitda_in_ms || 0)
        );
      default:
        return sorted;
    }
  }, [opportunities, sortBy]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <CardTitle className="text-base">
              Active Tier 1 Opportunities
            </CardTitle>
            {opportunities.length > 0 && (
              <Badge variant="secondary">
                {opportunities.length}
              </Badge>
            )}
          </div>
          
          {opportunities.length > 1 && (
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="ebitda">EBITDA</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {opportunities.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {sortedOpportunities.map((opp, index) => (
              <div 
                key={opp.id || index} 
                className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
              >
                <span className="text-sm font-medium truncate">{opp.deal_name}</span>
                {sortBy === 'ebitda' && opp.ebitda_in_ms && (
                  <Badge variant="outline" className="text-xs ml-2 shrink-0">
                    ${opp.ebitda_in_ms}M
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No active tier 1 opportunities found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
