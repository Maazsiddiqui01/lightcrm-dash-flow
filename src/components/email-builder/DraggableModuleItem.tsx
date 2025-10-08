import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings } from 'lucide-react';
import { TriStateToggle } from './TriStateToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TriState } from '@/types/phraseLibrary';

interface DraggableModuleItemProps {
  id: string;
  index: number;
  label: string;
  value: TriState;
  isDisabled: boolean;
  onChange: (value: TriState) => void;
  hasConfiguration?: boolean;
  onConfigure?: () => void;
  selectedItemsCount?: number;
}

export function DraggableModuleItem({
  id,
  index,
  label,
  value,
  isDisabled,
  onChange,
  hasConfiguration = false,
  onConfigure,
  selectedItemsCount = 0,
}: DraggableModuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isDisabled });

  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: prefersReducedMotion ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 rounded-lg border transition-all ${
        value === 'never' ? 'opacity-50 bg-muted/20' : 'bg-card'
      } ${isDragging ? 'shadow-lg z-50' : ''}`}
      role="listitem"
      aria-label={`Module ${index + 1}: ${label}`}
    >
      <div className="flex items-center gap-3">
        {/* Position Number */}
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
          {index + 1}
        </div>

        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none focus:outline-none focus:ring-2 focus:ring-primary rounded"
          aria-label={`Drag to reorder ${label}`}
          type="button"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
        </button>

        {/* Module Label */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {selectedItemsCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedItemsCount} selected
            </Badge>
          )}
        </div>

        {/* Tri-State Toggle */}
        <TriStateToggle value={value} onChange={onChange} />

        {/* Configure Button */}
        {hasConfiguration && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onConfigure?.();
            }}
            className="ml-2"
            aria-label={`Configure ${label}`}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
