import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { editableColumns } from '@/config/editableColumns';
import { EditState } from '@/lib/dynamicColumns';
import { toast } from '@/hooks/use-toast';
import { calculateDerivedFields } from '@/utils/opportunityHelpers';
import { getSafeUpdate, validateUpdate } from '@/utils/databaseUpdateHelpers';
import { parseSupabaseError, formatErrorForToast } from '@/utils/supabaseErrorParser';


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
  tableName: 'contacts_raw' | 'opportunities_raw' | 'lg_horizons_companies' | 'lg_horizons_gps',
  data: T[],
  onDataUpdate?: (updatedData: T[]) => void
): UseEditModeReturn {
  const queryClient = useQueryClient();
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
    // Only validate for tables that have editable column configs
    const tableConfig = editableColumns[tableName as keyof typeof editableColumns];
    const config = tableConfig?.[columnKey];
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

      // Calculate derived fields (e.g., lg_team from investment professional fields)
      const currentRowData = data.find(row => row.id === rowId);
      if (currentRowData) {
        const derivedFields = calculateDerivedFields(
          tableName,
          columnKey,
          currentRowData,
          newEditedRows[rowId]
        );

        // Add derived fields to the edited row
        Object.assign(newEditedRows[rowId], derivedFields);
      }

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
  }, [validateValue, data, tableName]);

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
      // CRITICAL: Use field whitelisting to prevent NULL constraint violations
      const updates = editedRowIds.map(rowId => {
        const safeUpdate = getSafeUpdate(tableName, editState.editedRows[rowId]);
        
        // Validate update doesn't contain forbidden fields
        const validation = validateUpdate(tableName, safeUpdate);
        if (!validation.valid) {
          console.error('[Edit Mode] Attempted to update forbidden fields:', validation.violations);
        }
        
        return {
          id: rowId,
          ...safeUpdate,
          updated_at: new Date().toISOString(),
        };
      });

      console.debug('[Edit Mode] Saving updates:', {
        count: updates.length,
        tableName,
        sampleFields: updates[0] ? Object.keys(updates[0]) : []
      });

      // Batch update to Supabase
      const { error } = await supabase
        .from(tableName)
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        // Enhanced error logging
        console.error('[Edit Mode] Save failed:', {
          tableName,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          },
          affectedRows: editedRowIds,
          timestamp: new Date().toISOString()
        });
        
        const errorInfo = formatErrorForToast(error, 'Save changes');
        toast({
          title: errorInfo.title,
          description: errorInfo.description,
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

      // Check if any group-related fields were edited and trigger group view refresh
      // Note: group_delta is now auto-synced via database triggers and should not be edited directly
      const hasGroupFieldEdits = editedRowIds.some(rowId => {
        const edits = editState.editedRows[rowId];
        return edits && (
          'group_email_role' in edits || 
          'group_contact' in edits ||
          'group_focus_area' in edits ||
          'group_sector' in edits
        );
      });

      if (hasGroupFieldEdits) {
        queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
      }

    } catch (error) {
      console.error('Unexpected save error:', error);
      const errorInfo = formatErrorForToast(error, 'Save changes');
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editState, tableName, data, onDataUpdate, queryClient]);

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