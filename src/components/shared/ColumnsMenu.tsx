import React, { useState, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Columns3, Search } from 'lucide-react';
import { ColumnDef } from '@/components/shared/AdvancedTable';

interface ColumnsMenuProps<T> {
  columns: ColumnDef<T>[];
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (columnKey: string, visible: boolean) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function ColumnsMenu<T>({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  onShowAll,
  onHideAll,
}: ColumnsMenuProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredColumns = useMemo(() => {
    return columns.filter(column => {
      if (column.enableHiding === false) return false;
      return column.label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [columns, searchTerm]);

  const visibleCount = useMemo(() => {
    return filteredColumns.filter(col => columnVisibility[col.key] !== false).length;
  }, [filteredColumns, columnVisibility]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="h-4 w-4 mr-2" />
          Columns ({visibleCount}/{filteredColumns.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Show Columns</DropdownMenuLabel>
        
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="p-2 space-y-1">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onShowAll}
              className="flex-1 text-xs"
            >
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onHideAll}
              className="flex-1 text-xs"
            >
              Hide All
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
          {filteredColumns.map((column) => (
            <div
              key={column.key}
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => onColumnVisibilityChange(column.key, !columnVisibility[column.key])}
            >
              <Checkbox
                id={column.key}
                checked={columnVisibility[column.key] !== false}
                onCheckedChange={(checked) => 
                  onColumnVisibilityChange(column.key, !!checked)
                }
              />
              <label
                htmlFor={column.key}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {column.label}
              </label>
            </div>
          ))}
        </div>

        {filteredColumns.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No columns found
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}