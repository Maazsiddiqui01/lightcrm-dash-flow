import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Briefcase, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignmentOpportunitiesTableProps {
  filterUserId: string | null;
  showUnassignedOnly: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function AssignmentOpportunitiesTable({
  filterUserId,
  showUnassignedOnly,
  selectedIds,
  onSelectionChange,
}: AssignmentOpportunitiesTableProps) {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['assignment-opportunities', filterUserId, showUnassignedOnly],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('id, deal_name, sector, lg_focus_area, status, tier, assigned_to, deal_source_individual_1, deal_source_individual_2')
        .order('created_at', { ascending: false })
        .limit(100);

      if (showUnassignedOnly) {
        query = query.is('assigned_to', null);
      } else if (filterUserId) {
        query = query.eq('assigned_to', filterUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(opportunities?.map(o => o.id) || []);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          {showUnassignedOnly 
            ? "No unassigned opportunities found" 
            : filterUserId 
            ? "No opportunities assigned to this user" 
            : "No opportunities found"}
        </p>
      </div>
    );
  }

  const allSelected = opportunities.length > 0 && opportunities.every(o => selectedIds.includes(o.id));
  const someSelected = opportunities.some(o => selectedIds.includes(o.id));

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
                className={someSelected && !allSelected ? "data-[state=checked]:bg-primary" : ""}
              />
            </TableHead>
            <TableHead>Deal Name</TableHead>
            <TableHead>Sector / Focus Area</TableHead>
            <TableHead>Referral Sources</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opp) => (
            <TableRow 
              key={opp.id}
              className={selectedIds.includes(opp.id) ? "bg-primary/5" : ""}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(opp.id)}
                  onCheckedChange={(checked) => handleSelectOne(opp.id, checked as boolean)}
                  aria-label={`Select ${opp.deal_name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{opp.deal_name || "Unnamed Deal"}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {opp.sector && (
                    <Badge variant="secondary" className="text-xs">
                      {opp.sector}
                    </Badge>
                  )}
                  {opp.lg_focus_area && (
                    <p className="text-xs text-muted-foreground">
                      {opp.lg_focus_area}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm space-y-1">
                  {opp.deal_source_individual_1 && (
                    <p className="text-xs">{opp.deal_source_individual_1}</p>
                  )}
                  {opp.deal_source_individual_2 && (
                    <p className="text-xs text-muted-foreground">{opp.deal_source_individual_2}</p>
                  )}
                  {!opp.deal_source_individual_1 && !opp.deal_source_individual_2 && "—"}
                </div>
              </TableCell>
              <TableCell>
                {opp.status && (
                  <Badge variant="outline" className="text-xs">
                    {opp.status}
                  </Badge>
                )}
                {opp.tier && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    Tier {opp.tier}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {!opp.assigned_to && (
                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                    Unassigned
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
