import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LgLead {
  lg_lead: string;
  avg_hours_per_week: number;
  opportunities: string;
}

interface LeadsTableProps {
  data: LgLead[];
  loading: boolean;
}

const ITEMS_PER_PAGE = 25;

const formatHours = (hours: number) => {
  // Round to nearest 0.25
  const rounded = Math.round(hours * 4) / 4;
  return rounded.toFixed(2);
};

const formatOpportunities = (opportunities: string) => {
  if (!opportunities || opportunities.trim() === '') return '—';
  // Limit display length and add ellipsis if needed
  if (opportunities.length > 100) {
    return opportunities.substring(0, 100) + '...';
  }
  return opportunities;
};

export function LeadsTable({ data, loading }: LeadsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentData = data.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>LG Leads</CardTitle>
          <CardDescription>Average hours per week and opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LG Lead</TableHead>
                <TableHead>Avg Hours/Week</TableHead>
                <TableHead>Opportunities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>LG Leads</CardTitle>
          <CardDescription>Average hours per week and opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No LG leads data available</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>LG Leads</CardTitle>
        <CardDescription>
          Average hours per week and opportunities ({data.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Table */}
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">LG Lead</TableHead>
                  <TableHead className="font-semibold text-right w-32">Avg Hours/Week</TableHead>
                  <TableHead className="font-semibold">Opportunities</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((lead, index) => (
                  <TableRow key={`${lead.lg_lead}-${index}`} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {lead.lg_lead || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatHours(lead.avg_hours_per_week)}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={lead.opportunities}>
                        {formatOpportunities(lead.opportunities)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of {data.length} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}