import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { SortLevel, ColumnOption } from './MultiSortDialog';

interface SortChipsProps {
  sortLevels: SortLevel[];
  columns: ColumnOption[];
  onClear: () => void;
  className?: string;
}

export function SortChips({ sortLevels, columns, onClear, className }: SortChipsProps) {
  if (sortLevels.length === 0) return null;

  const getColumnLabel = (key: string) => {
    return columns.find(col => col.key === key)?.label || key;
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground">Sorted by:</span>
      {sortLevels.map((level, index) => (
        <Badge key={`${level.id}-${index}`} variant="secondary" className="flex items-center gap-1">
          <span className="text-xs font-medium">{index + 1})</span>
          <span>{getColumnLabel(level.id)}</span>
          {level.desc ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )}
          {level.custom && (
            <span className="text-xs opacity-75">(custom)</span>
          )}
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="h-6 px-2 text-xs"
      >
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}