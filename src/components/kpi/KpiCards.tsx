import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, MessageSquare, Target, Calendar } from 'lucide-react';

interface KpiSummary {
  total_contacts: number;
  meetings_count: number;
  notable_opportunities: number;
}

interface KpiCardsProps {
  summary: KpiSummary | null;
  dateRange: string;
  loading: boolean;
}

const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

export function KpiCards({ summary, dateRange, loading }: KpiCardsProps) {
  const cards = [
    {
      title: 'Total Contacts',
      value: summary?.total_contacts ?? 0,
      icon: Users,
      color: 'text-blue-400',
    },
    {
      title: 'Total Meetings',
      value: summary?.meetings_count ?? 0,
      icon: MessageSquare,
      color: 'text-green-400',
    },
    {
      title: 'Notable Opportunities',
      value: summary?.notable_opportunities ?? 0,
      icon: Target,
      color: 'text-purple-400',
    },
    {
      title: 'Date Range',
      value: dateRange,
      icon: Calendar,
      color: 'text-orange-400',
      isText: true,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((_, index) => (
          <Card key={index} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="bg-card border-border hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {card.isText ? card.value : formatNumber(card.value as number)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}