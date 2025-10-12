import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Settings, Pencil, Check, X, Sparkles } from 'lucide-react';
import { TriStateToggle } from './TriStateToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onLabelChange?: (newLabel: string) => void;
  isChanged?: boolean;
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
  onLabelChange,
  isChanged = false,
}: DraggableModuleItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
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

  const handleStartEdit = () => {
    setEditValue(label);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && onLabelChange) {
      onLabelChange(trimmedValue);
      setIsEditing(false);
    } else if (!trimmedValue) {
      // If empty, revert to original label
      setEditValue(label);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditValue(label);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-3 rounded-lg border transition-all ${
        value === 'never' ? 'opacity-50 bg-muted/20' : 'bg-card'
      } ${isDragging ? 'shadow-lg z-50' : ''} ${
        isChanged ? 'ring-2 ring-amber-400 dark:ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30 animate-fade-in' : ''
      }`}
      role="listitem"
      aria-label={`Module ${index + 1}: ${label}`}
    >
      <div className="flex items-center gap-3">
        {/* Position Number with Change Indicator */}
        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
          isChanged 
            ? 'bg-amber-400 dark:bg-amber-500 text-white' 
            : 'bg-primary/10 text-primary'
        }`}>
          {isChanged ? <Sparkles className="h-3 w-3" /> : index + 1}
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
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm flex-1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                className="h-7 w-7 p-0"
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium">{label}</span>
              {onLabelChange && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit();
                  }}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Edit ${label} name`}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
              {selectedItemsCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedItemsCount === 1 ? 'Selected' : `${selectedItemsCount} selected`}
                </Badge>
              )}
            </>
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
