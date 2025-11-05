import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WrapText, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewFilter = 'all' | 'correct' | 'warning' | 'invalid';

interface CsvPreviewToolbarProps {
  viewFilter: ViewFilter;
  onViewFilterChange: (filter: ViewFilter) => void;
  textWrap: boolean;
  onToggleTextWrap: () => void;
  onResetColumns: () => void;
  counts: {
    total: number;
    valid: number;
    warning: number;
    invalid: number;
  };
}

export function CsvPreviewToolbar({
  viewFilter,
  onViewFilterChange,
  textWrap,
  onToggleTextWrap,
  onResetColumns,
  counts,
}: CsvPreviewToolbarProps) {
  return (
    <div className="p-4 bg-muted/30 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* View Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">View:</span>
        <ToggleGroup
          type="single"
          value={viewFilter}
          onValueChange={(value) => value && onViewFilterChange(value as ViewFilter)}
          className="gap-1"
        >
          <ToggleGroupItem 
            value="all" 
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            All Rows
            <Badge variant="secondary" className="ml-2">
              {counts.total}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="correct"
            className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
          >
            Correct
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
              {counts.valid}
            </Badge>
          </ToggleGroupItem>
          {counts.warning > 0 && (
            <ToggleGroupItem 
              value="warning"
              className="data-[state=on]:bg-yellow-600 data-[state=on]:text-white"
            >
              Warnings
              <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                {counts.warning}
              </Badge>
            </ToggleGroupItem>
          )}
          {counts.invalid > 0 && (
            <ToggleGroupItem 
              value="invalid"
              className="data-[state=on]:bg-red-600 data-[state=on]:text-white"
            >
              Invalid
              <Badge variant="secondary" className="ml-2 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
                {counts.invalid}
              </Badge>
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleTextWrap}
          className={cn(
            "gap-2",
            textWrap && "bg-primary/10 border-primary"
          )}
        >
          <WrapText className="h-4 w-4" />
          {textWrap ? "Wrap On" : "Wrap Off"}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onResetColumns}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Columns
        </Button>
      </div>
    </div>
  );
}
