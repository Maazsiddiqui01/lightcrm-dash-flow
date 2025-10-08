import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TriStateToggle } from './TriStateToggle';
import type { TriState } from '@/types/phraseLibrary';

interface DraggableModuleItemProps {
  id: string;
  index: number;
  label: string;
  value: TriState;
  isDisabled: boolean;
  onChange: (value: TriState) => void;
}

export function DraggableModuleItem({
  id,
  index,
  label,
  value,
  isDisabled,
  onChange,
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
        <span className="text-sm font-medium flex-1">{label}</span>

        {/* Tri-State Toggle */}
        <TriStateToggle value={value} onChange={onChange} />
      </div>
    </div>
  );
}
