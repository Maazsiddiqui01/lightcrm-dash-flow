import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

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

function formatNumber(value: string | number): string {
  if (typeof value === 'string') return value;
  return value.toLocaleString();
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between h-full">
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-semibold text-gray-900 mb-1">{formatNumber(value)}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}
              </span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          )}
        </div>
        <div className="ml-6 flex items-center justify-center">
          <div className="p-3 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon className="h-7 w-7 text-blue-600" />
          </div>
        </div>
      </div>
    </Card>
  );
}