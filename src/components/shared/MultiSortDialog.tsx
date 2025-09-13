import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Plus, 
  Search,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SortLevel {
  id: string;
  desc: boolean;
  custom?: string[];
}

export interface ColumnOption {
  key: string;
  label: string;
}

interface MultiSortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnOption[];
  sortLevels: SortLevel[];
  onApply: (sortLevels: SortLevel[]) => void;
  defaultCustomOrders?: Record<string, string[]>;
}

// Default custom orders for common fields
const DEFAULT_CUSTOM_ORDERS: Record<string, string[]> = {
  status: ['Active', 'Likely Pass', 'Pass', 'Longer-Term Opportunity'],
  tier: ['1', '2', '3'],
  ownership_type: ['Family/Founder', 'Sponsor Owned', 'Public', 'Unknown'],
  platform_add_on: ['Platform', 'Add-on', 'Both', 'Unknown'],
};

export function MultiSortDialog({
  open,
  onOpenChange,
  columns,
  sortLevels,
  onApply,
  defaultCustomOrders = DEFAULT_CUSTOM_ORDERS,
}: MultiSortDialogProps) {
  const [localSortLevels, setLocalSortLevels] = useState<SortLevel[]>([]);
  const [columnSearch, setColumnSearch] = useState('');

  // Initialize local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalSortLevels(sortLevels.length > 0 ? [...sortLevels] : []);
      setColumnSearch('');
    }
  }, [open, sortLevels]);

  // Filter columns for search
  const filteredColumns = columns.filter(col =>
    col.label.toLowerCase().includes(columnSearch.toLowerCase())
  );

  // Get used column IDs to prevent duplicates
  const usedColumnIds = new Set(localSortLevels.map(level => level.id));

  // Add a new sort level
  const addSortLevel = () => {
    const availableColumns = columns.filter(col => !usedColumnIds.has(col.key));
    if (availableColumns.length === 0) return;

    const newLevel: SortLevel = {
      id: availableColumns[0].key,
      desc: false,
    };
    setLocalSortLevels([...localSortLevels, newLevel]);
  };

  // Remove a sort level
  const removeSortLevel = (index: number) => {
    setLocalSortLevels(localSortLevels.filter((_, i) => i !== index));
  };

  // Move sort level up
  const moveLevelUp = (index: number) => {
    if (index === 0) return;
    const newLevels = [...localSortLevels];
    [newLevels[index - 1], newLevels[index]] = [newLevels[index], newLevels[index - 1]];
    setLocalSortLevels(newLevels);
  };

  // Move sort level down
  const moveLevelDown = (index: number) => {
    if (index === localSortLevels.length - 1) return;
    const newLevels = [...localSortLevels];
    [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
    setLocalSortLevels(newLevels);
  };

  // Update sort level
  const updateSortLevel = (index: number, updates: Partial<SortLevel>) => {
    const newLevels = [...localSortLevels];
    newLevels[index] = { ...newLevels[index], ...updates };
    setLocalSortLevels(newLevels);
  };

  // Toggle custom order for a level
  const toggleCustomOrder = (index: number, enabled: boolean) => {
    const level = localSortLevels[index];
    const updates: Partial<SortLevel> = enabled 
      ? { custom: defaultCustomOrders[level.id] || [] }
      : { custom: undefined };
    updateSortLevel(index, updates);
  };

  // Update custom order values
  const updateCustomOrder = (index: number, customText: string) => {
    const customArray = customText
      .split(/[,\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    updateSortLevel(index, { custom: customArray });
  };

  // Get column label by key
  const getColumnLabel = (key: string) => {
    return columns.find(col => col.key === key)?.label || key;
  };

  // Clear all sort levels
  const clearAll = () => {
    setLocalSortLevels([]);
  };

  // Apply changes
  const handleApply = () => {
    onApply(localSortLevels);
    onOpenChange(false);
  };

  // Check for duplicate columns
  const getDuplicateColumns = () => {
    const columnCounts = new Map<string, number>();
    localSortLevels.forEach(level => {
      columnCounts.set(level.id, (columnCounts.get(level.id) || 0) + 1);
    });
    return Array.from(columnCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([columnId]) => columnId);
  };

  const duplicateColumns = getDuplicateColumns();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sort</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sort Levels */}
          <div className="space-y-3">
            {localSortLevels.map((level, index) => {
              const isDuplicate = duplicateColumns.includes(level.id);
              const availableColumns = columns.filter(
                col => col.key === level.id || !usedColumnIds.has(col.key)
              );

              return (
                <div
                  key={index}
                  className={cn(
                    "border rounded-lg p-4 space-y-3",
                    isDuplicate && "border-destructive bg-destructive/5"
                  )}
                >
                  {/* Header with priority and controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {index + 1}
                      </Badge>
                      <span className="text-sm font-medium">Sort Level {index + 1}</span>
                      {isDuplicate && (
                        <Badge variant="destructive" className="text-xs">
                          Duplicate
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveLevelUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveLevelDown(index)}
                        disabled={index === localSortLevels.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSortLevel(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Column and Order selects */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Column</label>
                      <Select
                        value={level.id}
                        onValueChange={(value) => updateSortLevel(index, { id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search columns..."
                                value={columnSearch}
                                onChange={(e) => setColumnSearch(e.target.value)}
                                className="pl-8"
                              />
                            </div>
                          </div>
                          {filteredColumns
                            .filter(col => availableColumns.some(avail => avail.key === col.key))
                            .map((column) => (
                              <SelectItem key={column.key} value={column.key}>
                                {column.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-1 block">Order</label>
                      <Select
                        value={level.desc ? 'desc' : 'asc'}
                        onValueChange={(value) => updateSortLevel(index, { desc: value === 'desc' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Custom Order */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`custom-${index}`}
                        checked={!!level.custom}
                        onCheckedChange={(checked) => toggleCustomOrder(index, !!checked)}
                      />
                      <label htmlFor={`custom-${index}`} className="text-sm font-medium">
                        Use custom order
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Values not listed will be sorted after the listed items, then alphabetically
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {level.custom && (
                      <Textarea
                        placeholder="Enter values one per line or comma-separated..."
                        value={level.custom.join('\n')}
                        onChange={(e) => updateCustomOrder(index, e.target.value)}
                        className="min-h-20"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Level Button */}
          {localSortLevels.length < columns.length && (
            <Button
              variant="outline"
              onClick={addSortLevel}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sort Level
            </Button>
          )}

          {/* Warning for duplicates */}
          {duplicateColumns.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                Warning: Duplicate columns detected. Each column can only be used once.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={clearAll}>
            Clear All
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            disabled={duplicateColumns.length > 0}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}