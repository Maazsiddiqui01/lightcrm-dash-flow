import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableHead } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableTableHeadProps {
  columnKey: string;
  label: string | React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (key: string) => void;
  className?: string;
  style?: React.CSSProperties;
  isDraggable?: boolean;
  isCheckbox?: boolean;
  checkboxProps?: {
    checked: boolean;
    onCheckedChange: () => void;
    indeterminate?: boolean;
  };
  textWrap?: boolean;
  enableResizing?: boolean;
  resizable?: boolean;
  onResizeStart?: (columnKey: string) => void;
  onResizeMove?: (columnKey: string, width: number) => void;
  onResizeEnd?: () => void;
  columnWidth?: number;
}

export function DraggableTableHead({
  columnKey,
  label,
  sortable,
  sortKey,
  sortDirection,
  onSort,
  className,
  style,
  isDraggable = true,
  isCheckbox = false,
  checkboxProps,
  textWrap = false,
  enableResizing = false,
  resizable = true,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  columnWidth = 150,
}: DraggableTableHeadProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnKey,
    disabled: !isDraggable,
  });

  const draggableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSort = () => {
    if (sortable && onSort) {
      onSort(columnKey);
    }
  };
  
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!onResizeStart || !onResizeMove || !onResizeEnd) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    onResizeStart(columnKey);
    const startX = e.pageX;
    const startWidth = columnWidth;

    // Add visual feedback
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(80, Math.min(500, startWidth + (e.pageX - startX)));
      onResizeMove(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      onResizeEnd();
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <TableHead
      ref={setNodeRef}
      className={cn(
        'table-cell-compact text-left align-middle font-calibri-light font-normal text-table-header-foreground select-none bg-table-header relative group border-r',
        sortable && 'cursor-pointer hover:text-table-header-foreground/80 transition-colors',
        isDragging && 'z-50 shadow-lg ring-2 ring-primary',
        className
      )}
      style={{ ...style, ...draggableStyle }}
      onClick={handleSort}
    >
      {isCheckbox && checkboxProps ? (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={checkboxProps.checked}
            onCheckedChange={checkboxProps.onCheckedChange}
            className={checkboxProps.indeterminate ? "data-[state=checked]:bg-primary/50" : ""}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          {isDraggable && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </div>
          )}
          
          {/* Column Label */}
          <span className={cn(
            "leading-tight",
            textWrap ? "text-wrap break-words line-clamp-3" : "whitespace-nowrap"
          )}>
            {label}
          </span>
          
          {/* Sort Indicator */}
          {sortable && (
            <div className="flex flex-col">
              {sortKey === columnKey ? (
                sortDirection === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : sortDirection === 'desc' ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Resize Handle */}
      {enableResizing && resizable && !isCheckbox && onResizeStart && (
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-1 cursor-col-resize transition-all duration-200 flex items-center justify-center",
            "hover:w-2 hover:bg-primary/30",
            "active:bg-primary/50",
            "after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-6 after:bg-border after:rounded-full",
            "hover:after:bg-primary"
          )}
          onMouseDown={handleResizeMouseDown}
        >
          <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity duration-200" />
        </div>
      )}
    </TableHead>
  );
}
