import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, EyeOff, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface ColumnPreferencesIndicatorProps {
  visibleColumns: number;
  totalColumns: number;
  tableType: string;
}

export function ColumnPreferencesIndicator({ 
  visibleColumns, 
  totalColumns, 
  tableType 
}: ColumnPreferencesIndicatorProps) {
  const layout = useResponsiveLayout();
  
  const getDeviceIcon = () => {
    if (layout.category === 'mobile' || layout.category === 'tablet') {
      return <Smartphone className="h-3 w-3" />;
    } else if (layout.category === 'laptop') {
      return <Tablet className="h-3 w-3" />;
    } else {
      return <Monitor className="h-3 w-3" />;
    }
  };

  const getOptimalColumnCount = () => {
    return layout.config.maxColumns;
  };

  const isOptimal = visibleColumns <= getOptimalColumnCount();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {getDeviceIcon()}
            <Badge 
              variant={isOptimal ? "secondary" : "outline"}
              className="text-xs"
            >
              {visibleColumns}/{totalColumns} columns
            </Badge>
            {!isOptimal && (
              <span className="text-orange-500">•</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p><strong>Screen:</strong> {layout.category} ({layout.width}px)</p>
            <p><strong>Visible:</strong> {visibleColumns} of {totalColumns} columns</p>
            <p><strong>Optimal:</strong> {getOptimalColumnCount()} columns for this screen</p>
            {!isOptimal && (
              <p className="text-orange-500 mt-1">
                Consider hiding some columns for better performance
              </p>
            )}
            <p className="mt-1 text-muted-foreground">
              Your preferences are saved per table
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}