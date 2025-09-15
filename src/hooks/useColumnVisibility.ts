import { useState, useEffect, useCallback } from 'react';
import { getColumnVisibility, saveColumnVisibility } from '@/lib/dynamicColumns';
import { ColumnDef } from '@/components/shared/AdvancedTable';

export function useColumnVisibility(storageKey: string, initialColumns?: ColumnDef[]) {
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  // Load initial visibility from localStorage and merge with column defaults
  useEffect(() => {
    const saved = getColumnVisibility(storageKey);
    
    if (initialColumns) {
      // Initialize visibility state with column defaults, then apply saved preferences
      const defaultVisibility = initialColumns.reduce((acc, col) => {
        acc[col.key] = col.visible !== false; // Default to true unless explicitly false
        return acc;
      }, {} as Record<string, boolean>);
      
      // Merge with saved preferences (saved preferences take priority)
      const mergedVisibility = { ...defaultVisibility, ...saved };
      setColumnVisibility(mergedVisibility);
      
      // Save the merged state to ensure consistency
      if (Object.keys(saved).length === 0) {
        saveColumnVisibility(storageKey, mergedVisibility);
      }
    } else {
      setColumnVisibility(saved);
    }
  }, [storageKey, initialColumns]);

  // Update visibility and save to localStorage
  const updateColumnVisibility = useCallback((columnKey: string, visible: boolean) => {
    setColumnVisibility(prev => {
      const updated = { ...prev, [columnKey]: visible };
      saveColumnVisibility(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  // Show all columns
  const showAllColumns = useCallback((columns?: ColumnDef[]) => {
    const columnsToShow = columns || [];
    const updated = columnsToShow.reduce((acc, col) => {
      if (col.enableHiding !== false) {
        acc[col.key] = true;
      }
      return acc;
    }, {} as Record<string, boolean>);
    
    setColumnVisibility(prev => {
      const merged = { ...prev, ...updated };
      saveColumnVisibility(storageKey, merged);
      return merged;
    });
  }, [storageKey]);

  // Hide all non-essential columns (keep required ones)
  const hideAllColumns = useCallback((columns?: ColumnDef[]) => {
    const columnsToHide = columns || [];
    const updated = columnsToHide.reduce((acc, col) => {
      if (col.enableHiding !== false) {
        // Keep sticky/essential columns visible, hide others
        acc[col.key] = col.sticky === true || col.priority >= 100;
      }
      return acc;
    }, {} as Record<string, boolean>);
    
    setColumnVisibility(prev => {
      const merged = { ...prev, ...updated };
      saveColumnVisibility(storageKey, merged);
      return merged;
    });
  }, [storageKey]);

  // Reset to defaults
  const resetToDefaults = useCallback((columns?: ColumnDef[]) => {
    if (!columns) return;
    
    const defaultVisibility = columns.reduce((acc, col) => {
      acc[col.key] = col.visible !== false;
      return acc;
    }, {} as Record<string, boolean>);
    
    setColumnVisibility(defaultVisibility);
    saveColumnVisibility(storageKey, defaultVisibility);
  }, [storageKey]);

  // Apply visibility settings to columns
  const applyVisibilityToColumns = useCallback((columns: ColumnDef[]): ColumnDef[] => {
    return columns.map(col => ({
      ...col,
      visible: columnVisibility[col.key] !== undefined ? columnVisibility[col.key] : col.visible
    }));
  }, [columnVisibility]);

  return {
    columnVisibility,
    updateColumnVisibility,
    showAllColumns,
    hideAllColumns,
    resetToDefaults,
    applyVisibilityToColumns,
  };
}