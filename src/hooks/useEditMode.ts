import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { editableColumns } from '@/config/editableColumns';
import { EditState } from '@/lib/dynamicColumns';
import { toast } from '@/hooks/use-toast';


export interface UseEditModeReturn {
  editState: EditState;
  toggleEditMode: () => void;
  startEdit: (rowId: string, columnKey: string) => void;
  commitEdit: (rowId: string, columnKey: string, value: any) => void;
  cancelEdit: () => void;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
  isSaving: boolean;
}

export function useEditMode<T extends { id: string }>(
  tableName: 'contacts_raw' | 'opportunities_raw',
  data: T[],
  onDataUpdate?: (updatedData: T[]) => void
): UseEditModeReturn {
  const [editState, setEditState] = useState<EditState>({
    editMode: false,
    editingCell: null,
    editedRows: {},
    cellErrors: {},
  });
  const [isSaving, setIsSaving] = useState(false);

  const toggleEditMode = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      editMode: !prev.editMode,
      editingCell: null,
      editedRows: prev.editMode ? {} : prev.editedRows, // Clear edits when leaving edit mode
      cellErrors: prev.editMode ? {} : prev.cellErrors,
    }));
  }, []);

  const startEdit = useCallback((rowId: string, columnKey: string) => {
    setEditState(prev => ({
      ...prev,
      editingCell: { rowId, columnKey },
    }));
  }, []);

  const validateValue = useCallback((columnKey: string, value: any): string | null => {
    const config = editableColumns[tableName][columnKey];
    if (!config) return null;

    if (config.required && (!value || value === '')) {
      return 'This field is required';
    }

    if (config.validation) {
      return config.validation(value);
    }

    return null;
  }, [tableName]);

  const commitEdit = useCallback((rowId: string, columnKey: string, value: any) => {
    const error = validateValue(columnKey, value);
    
    setEditState(prev => {
      const newEditedRows = { ...prev.editedRows };
      const newCellErrors = { ...prev.cellErrors };

      // Update the value
      if (!newEditedRows[rowId]) {
        newEditedRows[rowId] = {};
      }
      newEditedRows[rowId][columnKey] = value;

      // Update errors
      if (!newCellErrors[rowId]) {
        newCellErrors[rowId] = {};
      }
      
      if (error) {
        newCellErrors[rowId][columnKey] = error;
      } else {
        delete newCellErrors[rowId][columnKey];
        if (Object.keys(newCellErrors[rowId]).length === 0) {
          delete newCellErrors[rowId];
        }
      }

      return {
        ...prev,
        editedRows: newEditedRows,
        cellErrors: newCellErrors,
        editingCell: null,
      };
    });
  }, [validateValue]);

  const cancelEdit = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      editingCell: null,
    }));
  }, []);

  const saveChanges = useCallback(async () => {
    const editedRowIds = Object.keys(editState.editedRows);
    if (editedRowIds.length === 0) return;

    // Check for any validation errors
    const hasErrors = Object.keys(editState.cellErrors).length > 0;
    if (hasErrors) {
      toast({
        title: "Validation Errors",
        description: "Please fix all validation errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare updates
      const updates = editedRowIds.map(rowId => ({
        id: rowId,
        ...editState.editedRows[rowId],
        updated_at: new Date().toISOString(),
      }));

      // Batch update to Supabase
      const { error } = await supabase
        .from(tableName)
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Save error:', error);
        toast({
          title: "Save Failed",
          description: error.message || "Failed to save changes. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Update local data if callback provided
      if (onDataUpdate) {
        const updatedData = data.map(row => {
          const edits = editState.editedRows[row.id];
          return edits ? { ...row, ...edits } : row;
        });
        onDataUpdate(updatedData as T[]);
      }

      // Clear edit state
      setEditState(prev => ({
        ...prev,
        editedRows: {},
        cellErrors: {},
        editingCell: null,
      }));

      toast({
        title: "Changes Saved",
        description: `${editedRowIds.length} row${editedRowIds.length !== 1 ? 's' : ''} updated successfully.`,
      });

    } catch (error) {
      console.error('Unexpected save error:', error);
      toast({
        title: "Save Failed", 
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editState, tableName, data, onDataUpdate]);

  const discardChanges = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      editedRows: {},
      cellErrors: {},
      editingCell: null,
    }));
    
    toast({
      title: "Changes Discarded",
      description: "All unsaved changes have been discarded.",
    });
  }, []);

  return {
    editState,
    toggleEditMode,
    startEdit,
    commitEdit,
    cancelEdit,
    saveChanges,
    discardChanges,
    isSaving,
  };
}