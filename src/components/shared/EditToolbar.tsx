import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, X, Edit, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditToolbarProps {
  editMode: boolean;
  onToggleEditMode: () => void;
  editedRowsCount: number;
  onSave: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
  disabled?: boolean;
}

export function EditToolbar({
  editMode,
  onToggleEditMode,
  editedRowsCount,
  onSave,
  onDiscard,
  isSaving = false,
  disabled = false,
}: EditToolbarProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 border-b bg-muted/50",
      editMode && editedRowsCount > 0 && "bg-primary/10 border-primary/20"
    )}>
      <div className="flex items-center gap-3">
        <Button
          variant={editMode ? "default" : "outline"}
          size="sm"
          onClick={onToggleEditMode}
          disabled={disabled}
        >
          {editMode ? (
            <>
              <Eye className="h-4 w-4 mr-2" />
              View Mode
            </>
          ) : (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Mode
            </>
          )}
        </Button>

        {editMode && (
          <div className="text-sm text-muted-foreground">
            Click any cell to edit. Press Enter to save, Esc to cancel.
          </div>
        )}
      </div>

      {editMode && editedRowsCount > 0 && (
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-primary/20 text-primary">
            {editedRowsCount} row{editedRowsCount !== 1 ? 's' : ''} edited
          </Badge>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Discard
            </Button>
            
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}