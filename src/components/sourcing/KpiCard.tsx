import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  title: string;
  value: number;
  format?: 'number' | 'currency' | 'percentage';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function KpiCard({ title, value, format = 'number', loading, icon }: KpiCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return `$${val.toFixed(1)}M`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat().format(Math.round(val));
    }
  };

  if (loading) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center space-x-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatValue(value)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}