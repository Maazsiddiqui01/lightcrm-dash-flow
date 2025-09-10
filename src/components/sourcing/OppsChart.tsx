import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OppsChartProps {
  type: 'tier' | 'status' | 'ebitda' | 'platform-addon' | 'referral-contacts' | 'referral-companies';
  data: any[];
  loading: boolean;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
  'hsl(220 70% 50%)',
  'hsl(280 70% 50%)',
  'hsl(340 70% 50%)',
  'hsl(40 70% 50%)',
  'hsl(120 70% 50%)',
  'hsl(200 70% 50%)',
];

export function OppsChart({ type, data, loading }: OppsChartProps) {
  const getChartConfig = () => {
    switch (type) {
      case 'tier':
        return {
          title: 'Opportunities by Tier',
          description: 'Distribution of opportunities by tier',
          chartType: 'pie' as const,
          dataKey: 'tier',
          valueKey: 'count',
        };
      case 'status':
        return {
          title: 'Opportunities by Status',
          description: 'Distribution of opportunities by status',
          chartType: 'bar' as const,
          dataKey: 'status',
          valueKey: 'count',
        };
      case 'ebitda':
        return {
          title: 'Opportunities by EBITDA',
          description: 'Distribution by EBITDA buckets',
          chartType: 'bar' as const,
          dataKey: 'bucket',
          valueKey: 'count',
        };
      case 'platform-addon':
        return {
          title: 'Platform vs Add-on',
          description: 'Distribution of platform and add-on opportunities',
          chartType: 'bar' as const,
          dataKey: 'type',
          valueKey: 'count',
        };
      case 'referral-contacts':
        return {
          title: 'Top Referral Contacts',
          description: 'Top referral sources by person',
          chartType: 'horizontal-bar' as const,
          dataKey: 'referral_contact_display',
          valueKey: 'opp_count',
        };
      case 'referral-companies':
        return {
          title: 'Top Referral Companies',
          description: 'Top referral sources by organization',
          chartType: 'horizontal-bar' as const,
          dataKey: 'referral_company_display',
          valueKey: 'opp_count',
        };
      default:
        return {
          title: 'Chart',
          description: '',
          chartType: 'bar' as const,
          dataKey: 'name',
          valueKey: 'value',
        };
    }
  };

  const processData = () => {
    if (type === 'referral-contacts' || type === 'referral-companies') {
      return data.slice(0, 10); // Already processed
    }

    if (type === 'ebitda') {
      const buckets = { '<20': 0, '20-35': 0, '>35': 0 };
      data.forEach(opp => {
        const ebitda = Number(opp.ebitda_m) || 0;
        if (ebitda < 20) buckets['<20']++;
        else if (ebitda <= 35) buckets['20-35']++;
        else buckets['>35']++;
      });
      return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
    }

    if (type === 'platform-addon') {
      const platformCount = data.filter(opp => 
        opp.platform_add_on?.toLowerCase().includes('platform')
      ).length;
      const addonCount = data.filter(opp => 
        opp.platform_add_on?.toLowerCase().includes('add')
      ).length;
      return [
        { type: 'Platform', count: platformCount },
        { type: 'Add-on', count: addonCount },
      ];
    }

    // For tier and status
    const field = type === 'tier' ? 'tier' : 'status';
    const counts = data.reduce((acc, opp) => {
      const value = opp[field] || 'Unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([key, count]) => ({ [field]: key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const config = getChartConfig();
  const chartData = processData();

  if (loading) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <Skeleton className="w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    if (config.chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey={config.valueKey}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (config.chartType === 'horizontal-bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="horizontal"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis 
              type="category" 
              dataKey={config.dataKey} 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              width={90}
              tick={{ fontSize: 10 }}
            />
            <Tooltip />
            <Bar dataKey={config.valueKey} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey={config.dataKey} 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tick={{ fontSize: 10 }}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip />
          <Bar dataKey={config.valueKey} fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}