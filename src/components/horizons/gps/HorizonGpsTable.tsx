import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface HorizonGpFilters {
  lgRelationship: string[];
  aumMin?: number;
  aumMax?: number;
  state: string[];
  industrySector: string[];
  priority: string[];
}

interface HorizonGpsTableProps {
  filters: HorizonGpFilters;
  selectedRows: string[];
  onSelectionChange: (rows: string[]) => void;
}

export function HorizonGpsTable({ filters, selectedRows, onSelectionChange }: HorizonGpsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: gps = [], isLoading } = useQuery({
    queryKey: ['horizon-gps', filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('lg_horizons_gps')
        .select('*')
        .order('priority', { ascending: true, nullsFirst: false })
        .order('gp_name', { ascending: true });

      // Apply filters
      if (filters.state.length > 0) {
        query = query.in('fund_hq_state', filters.state);
      }
      if (filters.priority.length > 0) {
        const priorityValues = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
        if (priorityValues.length > 0) {
          query = query.in('priority', priorityValues);
        }
      }
      if (filters.aumMin != null) {
        query = query.gte('aum_numeric', filters.aumMin * 1_000_000_000);
      }
      if (filters.aumMax != null) {
        query = query.lte('aum_numeric', filters.aumMax * 1_000_000_000);
      }
      if (searchTerm.trim()) {
        query = query.or(`gp_name.ilike.%${searchTerm}%,industry_sector_focus.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const toggleRow = (id: string) => {
    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter(r => r !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };

  const toggleAll = () => {
    if (selectedRows.length === gps.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(gps.map(g => g.id));
    }
  };

  const getPriorityBadge = (priority: number | null) => {
    if (!priority) return null;
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">{priority}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search GPs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={gps.length > 0 && selectedRows.length === gps.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>GP Name</TableHead>
              <TableHead>LG Relationship</TableHead>
              <TableHead>AUM</TableHead>
              <TableHead>Active Holdings</TableHead>
              <TableHead>Industry/Sector</TableHead>
              <TableHead>HQ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No GPs found. Import data or add a new GP to get started.
                </TableCell>
              </TableRow>
            ) : (
              gps.map((gp) => (
                <TableRow key={gp.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(gp.id)}
                      onCheckedChange={() => toggleRow(gp.id)}
                    />
                  </TableCell>
                  <TableCell>{getPriorityBadge(gp.priority)}</TableCell>
                  <TableCell className="font-medium">
                    {gp.gp_url ? (
                      <a href={gp.gp_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {gp.gp_name}
                      </a>
                    ) : (
                      gp.gp_name
                    )}
                  </TableCell>
                  <TableCell>{gp.lg_relationship}</TableCell>
                  <TableCell>{gp.aum}</TableCell>
                  <TableCell>{gp.active_holdings}</TableCell>
                  <TableCell className="max-w-xs truncate">{gp.industry_sector_focus}</TableCell>
                  <TableCell>
                    {[gp.fund_hq_city, gp.fund_hq_state].filter(Boolean).join(', ')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Showing {gps.length} GPs
      </div>
    </div>
  );
}
