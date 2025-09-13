import { useState, useEffect, useCallback } from 'react';
import { getColumnVisibility, saveColumnVisibility } from '@/lib/dynamicColumns';

export function useColumnVisibility(storageKey: string) {
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  // Load initial visibility from localStorage
  useEffect(() => {
    const saved = getColumnVisibility(storageKey);
    setColumnVisibility(saved);
  }, [storageKey]);

  // Update visibility and save to localStorage
  const updateColumnVisibility = useCallback((columnKey: string, visible: boolean) => {
    setColumnVisibility(prev => {
      const updated = { ...prev, [columnKey]: visible };
      saveColumnVisibility(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  // Show all columns
  const showAllColumns = useCallback(() => {
    setColumnVisibility(prev => {
      const updated = Object.keys(prev).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);
      saveColumnVisibility(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  // Hide all columns (except required ones)
  const hideAllColumns = useCallback(() => {
    setColumnVisibility(prev => {
      const updated = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);
      saveColumnVisibility(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  return {
    columnVisibility,
    updateColumnVisibility,
    showAllColumns,
    hideAllColumns,
  };
}