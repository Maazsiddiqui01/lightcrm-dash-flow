import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyMeeting {
  month: string;
  count: number;
}

interface MeetingsChartProps {
  data: MonthlyMeeting[];
  loading: boolean;
}

const formatMonth = (dateString: string) => {
  const date = new Date(dateString + '-01');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-md p-3">
        <p className="text-sm font-medium text-foreground">
          {formatMonth(label)}
        </p>
        <p className="text-sm text-muted-foreground">
          Meetings: <span className="font-medium text-primary">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export function MeetingsChart({ data, loading }: MeetingsChartProps) {
  // Transform data for chart
  const chartData = (data || [])
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      ...item,
      monthLabel: formatMonth(item.month),
    }));

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Meetings per Month</CardTitle>
          <CardDescription>Track meeting activity over time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[300px] w-full">
            <div className="flex items-end justify-between h-full px-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 h-full justify-end">
                  <Skeleton className="w-8 h-[60%] rounded" />
                  <Skeleton className="w-10 h-3" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Meetings per Month</CardTitle>
          <CardDescription>Track meeting activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No meeting data available</p>
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
        <CardTitle>Meetings per Month</CardTitle>
        <CardDescription>Track meeting activity over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="meetingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="monthLabel"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                fill="url(#meetingGradient)"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}