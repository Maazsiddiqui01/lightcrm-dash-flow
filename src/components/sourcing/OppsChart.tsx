import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

interface OppsChartProps {
  type: 'tier' | 'status' | 'ebitda' | 'platform-addon' | 'lg-leads' | 'sector';
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
      case 'lg-leads':
        return {
          title: 'Top LG Leads by Opportunities',
          description: 'Deal sourcing performance by team member',
          chartType: 'bar' as const,
          dataKey: 'lead',
          valueKey: 'count',
        };
      case 'sector':
        return {
          title: 'Opportunities by Sector',
          description: 'Distribution across sectors',
          chartType: 'pie' as const,
          dataKey: 'sector',
          valueKey: 'count',
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
    if (type === 'lg-leads') {
      // Count opportunities by LG lead
      const leadCounts = data.reduce((acc, opp) => {
        const lead1 = opp.investment_professional_point_person_1?.trim();
        const lead2 = opp.investment_professional_point_person_2?.trim();
        
        if (lead1) acc[lead1] = (acc[lead1] || 0) + 1;
        if (lead2) acc[lead2] = (acc[lead2] || 0) + 1;
        
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(leadCounts)
        .map(([lead, count]) => ({ lead, count: Number(count) }))
        .sort((a, b) => Number(b.count) - Number(a.count))
        .slice(0, 8);
    }

    if (type === 'sector') {
      // Count opportunities by sector
      const sectorCounts = data.reduce((acc, opp) => {
        const sector = opp.sector?.trim() || 'Unknown';
        acc[sector] = (acc[sector] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(sectorCounts)
        .map(([sector, count]) => ({ sector, count: Number(count) }))
        .sort((a, b) => Number(b.count) - Number(a.count));
    }

    if (type === 'ebitda') {
      const buckets = { '<30': 0, '30-35': 0, '>35': 0 };
      data.forEach(opp => {
        const ebitda = Number(opp.ebitda_in_ms) || 0;
        if (ebitda < 30) buckets['<30']++;
        else if (ebitda <= 35) buckets['30-35']++;
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
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([key, count]) => ({ [field]: key, count: Number(count) }))
      .sort((a, b) => Number(b.count) - Number(a.count))
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
              outerRadius={110}
              paddingAngle={3}
              dataKey={config.valueKey}
              label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  }}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [value, name]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => `${value}: ${entry.payload?.[config.valueKey] || ''}`}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
          <defs>
            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey={config.dataKey} 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip 
            formatter={(value) => [value, 'Opportunities']}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Bar 
            dataKey={config.valueKey} 
            fill="url(#colorBar)"
            radius={[8, 8, 0, 0]}
          >
            <LabelList 
              dataKey={config.valueKey} 
              position="top" 
              style={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="rounded-xl shadow-lg border-border/50 bg-gradient-to-br from-card to-card/80">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{config.title}</CardTitle>
        <CardDescription className="text-sm">{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}