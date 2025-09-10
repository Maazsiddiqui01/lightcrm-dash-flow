import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, TrendingUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KpiFilters } from '@/state/useKpiFilters';

interface KpiSummary {
  total_contacts: number;
  total_meetings: number;
  notable_opportunities: number;
}

interface KpiCardsNewProps {
  summary: KpiSummary | null;
  dateRange: string;
  loading: boolean;
  filters: KpiFilters;
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

const buildFilterUrl = (basePath: string, filters: KpiFilters, extraParams: Record<string, string> = {}) => {
  const params = new URLSearchParams();
  
  if (filters.dateStart) params.set('start', filters.dateStart);
  if (filters.dateEnd) params.set('end', filters.dateEnd);
  if (filters.focusAreas.length > 0) params.set('fa', filters.focusAreas.join(','));
  if (filters.sectors.length > 0) params.set('sector', filters.sectors.join(','));
  if (filters.ownership.length > 0) params.set('ownership', filters.ownership.join(','));
  
  Object.entries(extraParams).forEach(([key, value]) => {
    params.set(key, value);
  });
  
  return `${basePath}?${params.toString()}`;
};

export function KpiCardsNew({ summary, dateRange, loading, filters }: KpiCardsNewProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Contacts',
      value: summary?.total_contacts || 0,
      icon: Users,
      href: buildFilterUrl('/contacts', filters),
    },
    {
      title: 'Total Meetings',
      value: summary?.total_meetings || 0,
      icon: Calendar,
      href: buildFilterUrl('/interactions', filters, { source: 'Meeting' }),
    },
    {
      title: 'Notable Opportunities',
      value: summary?.notable_opportunities || 0,
      icon: TrendingUp,
      href: buildFilterUrl('/opportunities', filters),
    },
    {
      title: 'Date Range',
      value: dateRange,
      icon: Calendar,
      isText: true,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} className="relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.isText ? card.value : formatNumber(card.value as number)}
            </div>
            {card.href && (
              <div className="mt-2">
                <Button asChild variant="ghost" size="sm" className="h-auto p-0 text-xs">
                  <Link to={card.href} className="flex items-center gap-1">
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}