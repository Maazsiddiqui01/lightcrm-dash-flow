import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface HorizonCompanyFilters {
  sector: string[];
  subsector: string[];
  processStatus: string[];
  ownership: string[];
  priority: string[];
  lgRelationship: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  revenueMin?: number;
  revenueMax?: number;
  gpAumMin?: number;
  gpAumMax?: number;
  state: string[];
  city: string[];
  source: string[];
  parentGp: string[];
}

interface HorizonCompaniesTableProps {
  filters: HorizonCompanyFilters;
  selectedRows: string[];
  onSelectionChange: (rows: string[]) => void;
}

export function HorizonCompaniesTable({ filters, selectedRows, onSelectionChange }: HorizonCompaniesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['horizon-companies', filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('lg_horizons_companies')
        .select('*')
        .order('priority', { ascending: true, nullsFirst: false })
        .order('company_name', { ascending: true });

      // Apply filters
      if (filters.sector.length > 0) {
        query = query.in('sector', filters.sector);
      }
      if (filters.subsector.length > 0) {
        query = query.in('subsector', filters.subsector);
      }
      if (filters.processStatus.length > 0) {
        query = query.in('process_status', filters.processStatus);
      }
      if (filters.ownership.length > 0) {
        query = query.in('ownership', filters.ownership);
      }
      if (filters.priority.length > 0) {
        const priorityValues = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
        if (priorityValues.length > 0) {
          query = query.in('priority', priorityValues);
        }
      }
      if (filters.state.length > 0) {
        query = query.in('company_hq_state', filters.state);
      }
      if (filters.city.length > 0) {
        query = query.in('company_hq_city', filters.city);
      }
      if (filters.source.length > 0) {
        query = query.in('source', filters.source);
      }
      if (filters.parentGp.length > 0) {
        query = query.in('parent_gp_name', filters.parentGp);
      }
      if (filters.ebitdaMin != null) {
        query = query.gte('ebitda_numeric', filters.ebitdaMin);
      }
      if (filters.ebitdaMax != null) {
        query = query.lte('ebitda_numeric', filters.ebitdaMax);
      }
      if (filters.revenueMin != null) {
        query = query.gte('revenue_numeric', filters.revenueMin);
      }
      if (filters.revenueMax != null) {
        query = query.lte('revenue_numeric', filters.revenueMax);
      }
      if (filters.gpAumMin != null) {
        query = query.gte('gp_aum_numeric', filters.gpAumMin * 1_000_000_000);
      }
      if (filters.gpAumMax != null) {
        query = query.lte('gp_aum_numeric', filters.gpAumMax * 1_000_000_000);
      }
      if (searchTerm.trim()) {
        query = query.or(`company_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sector.ilike.%${searchTerm}%`);
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
    if (selectedRows.length === companies.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(companies.map(c => c.id));
    }
  };

  const getPriorityBadge = (priority: number | null) => {
    if (!priority) return null;
    const variants: Record<number, string> = {
      1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      3: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    return <Badge className={variants[priority] || ""}>{priority}</Badge>;
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
          placeholder="Search companies..."
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
                  checked={companies.length > 0 && selectedRows.length === companies.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Subsector</TableHead>
              <TableHead>EBITDA</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Parent/GP</TableHead>
              <TableHead>GP AUM</TableHead>
              <TableHead>Process Status</TableHead>
              <TableHead>HQ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No companies found. Import data or add a new company to get started.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(company.id)}
                      onCheckedChange={() => toggleRow(company.id)}
                    />
                  </TableCell>
                  <TableCell>{getPriorityBadge(company.priority)}</TableCell>
                  <TableCell className="font-medium">
                    {company.company_url ? (
                      <a href={company.company_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {company.company_name}
                      </a>
                    ) : (
                      company.company_name
                    )}
                  </TableCell>
                  <TableCell>{company.sector}</TableCell>
                  <TableCell>{company.subsector}</TableCell>
                  <TableCell>{company.ebitda}</TableCell>
                  <TableCell>{company.ownership}</TableCell>
                  <TableCell>{company.parent_gp_name}</TableCell>
                  <TableCell>{company.gp_aum}</TableCell>
                  <TableCell>
                    {company.process_status && (
                      <Badge variant="outline">{company.process_status}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {[company.company_hq_city, company.company_hq_state].filter(Boolean).join(', ')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Showing {companies.length} companies
      </div>
    </div>
  );
}
