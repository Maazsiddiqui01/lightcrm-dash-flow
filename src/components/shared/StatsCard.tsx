import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend }: StatsCardProps) {
  const formattedValue = typeof value === 'number' ? formatNumber(value) : value;
  
  return (
    <Card className="p-3 lg:p-6 bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200 hover-lift">
      <div className="flex items-center justify-between h-full">
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <p className="text-fluid-sm font-medium text-muted-foreground mb-1 lg:mb-2 truncate">{title}</p>
          <p className="text-fluid-xl lg:text-fluid-3xl font-semibold text-foreground mb-1 break-words">{formattedValue}</p>
          {subtitle && (
            <p className="text-fluid-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-1 lg:mt-2">
              <span className={`text-fluid-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}
              </span>
              <span className="text-fluid-sm text-muted-foreground ml-1 truncate">from last month</span>
            </div>
          )}
        </div>
        <div className="ml-3 lg:ml-6 flex items-center justify-center flex-shrink-0">
          <div className="p-2 lg:p-3 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
          </div>
        </div>
      </div>
    </Card>
  );
}