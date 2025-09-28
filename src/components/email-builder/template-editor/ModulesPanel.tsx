import { useState } from "react";
import { TemplateSettings } from "@/hooks/useTemplateSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Layers, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModulesPanelProps {
  settings: TemplateSettings;
  onSettingsChange: (settings: TemplateSettings) => void;
}

const TRI_STATE_OPTIONS = [
  { value: 'Always', label: 'Always', color: 'bg-green-500' },
  { value: 'Sometimes', label: 'Sometimes', color: 'bg-yellow-500' },
  { value: 'Never', label: 'Never', color: 'bg-red-500' },
];

export function ModulesPanel({ settings, onSettingsChange }: ModulesPanelProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const updateTriState = (module: string, triState: 'Always' | 'Sometimes' | 'Never') => {
    onSettingsChange({
      ...settings,
      modules: {
        ...settings.modules,
        triState: {
          ...settings.modules.triState,
          [module]: triState,
        },
      },
    });
  };

  const moveModule = (module: string, direction: 'up' | 'down') => {
    const currentOrder = [...settings.modules.order];
    const index = currentOrder.indexOf(module);
    
    if (direction === 'up' && index > 0) {
      [currentOrder[index], currentOrder[index - 1]] = [currentOrder[index - 1], currentOrder[index]];
    } else if (direction === 'down' && index < currentOrder.length - 1) {
      [currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]];
    }

    onSettingsChange({
      ...settings,
      modules: {
        ...settings.modules,
        order: currentOrder,
      },
    });
  };

  const getTriStateColor = (triState: string) => {
    const option = TRI_STATE_OPTIONS.find(opt => opt.value === triState);
    return option?.color || 'bg-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Modules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {settings.modules.order.map((module, index) => {
          const triState = settings.modules.triState[module] || 'Sometimes';
          const isFirst = index === 0;
          const isLast = index === settings.modules.order.length - 1;

          return (
            <div
              key={module}
              className={cn(
                "flex items-center gap-3 p-3 border rounded-lg bg-card",
                draggedItem === module && "opacity-50"
              )}
            >
              {/* Drag Handle & Move Buttons */}
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveModule(module, 'up')}
                  disabled={isFirst}
                  className="h-4 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveModule(module, 'down')}
                  disabled={isLast}
                  className="h-4 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Module Name */}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{module}</span>
              </div>

              {/* Tri-State Selector */}
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", getTriStateColor(triState))} />
                <Select
                  value={triState}
                  onValueChange={(value) => updateTriState(module, value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRI_STATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", option.color)} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}

        {/* Module Summary */}
        <div className="pt-3 border-t">
          <div className="flex flex-wrap gap-1">
            {TRI_STATE_OPTIONS.map((option) => {
              const count = settings.modules.order.filter(
                module => settings.modules.triState[module] === option.value
              ).length;
              return (
                <Badge key={option.value} variant="secondary" className="text-xs">
                  <div className={cn("w-2 h-2 rounded-full mr-1", option.color)} />
                  {option.label}: {count}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}