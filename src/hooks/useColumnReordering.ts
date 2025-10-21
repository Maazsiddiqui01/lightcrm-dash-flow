import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@/components/shared/ResponsiveAdvancedTable';

interface UseColumnReorderingOptions<T = any> {
  tableId: string;
  columns: ColumnDef<T>[];
  lockedColumns?: string[]; // columns that can't be moved (sticky, actions, select)
}

interface UseColumnReorderingReturn<T = any> {
  columnOrder: string[];
  reorderedColumns: ColumnDef<T>[];
  reorderColumns: (activeId: string, overId: string) => void;
  resetOrder: () => void;
  hasCustomOrder: boolean;
}

export function useColumnReordering<T = any>({
  tableId,
  columns,
  lockedColumns = []
}: UseColumnReorderingOptions<T>): UseColumnReorderingReturn<T> {
  const storageKey = `column-order:${tableId}`;
  
  // Get initial column order from localStorage or default to current order
  const getInitialOrder = (): string[] => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that all columns still exist
        const columnKeys = new Set(columns.map(c => c.key));
        const validOrder = parsed.filter((key: string) => columnKeys.has(key));
        
        // Add any new columns that weren't in storage
        const newColumns = columns
          .map(c => c.key)
          .filter(key => !validOrder.includes(key));
        
        return [...validOrder, ...newColumns];
      }
    } catch (error) {
      console.error('Error loading column order:', error);
    }
    
    return columns.map(c => c.key);
  };
  
  const [columnOrder, setColumnOrder] = useState<string[]>(getInitialOrder);
  
  // Check if there's a custom order
  const hasCustomOrder = useMemo(() => {
    const defaultOrder = columns.map(c => c.key).join(',');
    const currentOrder = columnOrder.join(',');
    return defaultOrder !== currentOrder;
  }, [columnOrder, columns]);
  
  // Save order to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnOrder));
    } catch (error) {
      console.error('Error saving column order:', error);
    }
  }, [columnOrder, storageKey]);
  
  // Update column order when columns change (e.g., new columns added)
  useEffect(() => {
    const currentKeys = new Set(columnOrder);
    const newColumns = columns
      .map(c => c.key)
      .filter(key => !currentKeys.has(key));
    
    if (newColumns.length > 0) {
      setColumnOrder(prev => [...prev, ...newColumns]);
    }
  }, [columns]);
  
  // Reorder columns based on saved order
  const reorderedColumns = useMemo(() => {
    const orderMap = new Map(columnOrder.map((key, index) => [key, index]));
    
    return [...columns].sort((a, b) => {
      const orderA = orderMap.get(a.key) ?? 999;
      const orderB = orderMap.get(b.key) ?? 999;
      return orderA - orderB;
    });
  }, [columns, columnOrder]);
  
  // Handle reordering
  const reorderColumns = (activeId: string, overId: string) => {
    if (activeId === overId) return;
    
    // Don't allow reordering locked columns
    if (lockedColumns.includes(activeId) || lockedColumns.includes(overId)) {
      return;
    }
    
    setColumnOrder(prev => {
      const oldIndex = prev.indexOf(activeId);
      const newIndex = prev.indexOf(overId);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const newOrder = [...prev];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, activeId);
      
      return newOrder;
    });
  };
  
  // Reset to default order
  const resetOrder = () => {
    const defaultOrder = columns.map(c => c.key);
    setColumnOrder(defaultOrder);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing column order:', error);
    }
  };
  
  return {
    columnOrder,
    reorderedColumns,
    reorderColumns,
    resetOrder,
    hasCustomOrder
  };
}
