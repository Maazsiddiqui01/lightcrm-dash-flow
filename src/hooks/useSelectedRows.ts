import { useState, useCallback, useEffect } from 'react';

interface UseSelectedRowsOptions {
  tableId: string;
  data: any[];
  idKey?: string;
}

export function useSelectedRows({ tableId, data, idKey = 'id' }: UseSelectedRowsOptions) {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Clear selection when data changes (e.g., filters applied)
  useEffect(() => {
    if (selectedRowIds.size > 0) {
      const currentDataIds = new Set(data.map(row => row[idKey]));
      const validSelectedIds = new Set(
        Array.from(selectedRowIds).filter(id => currentDataIds.has(id))
      );
      
      if (validSelectedIds.size !== selectedRowIds.size) {
        setSelectedRowIds(validSelectedIds);
      }
    }
  }, [data, idKey, selectedRowIds]);

  const selectRow = useCallback((rowId: string) => {
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      newSet.add(rowId);
      return newSet;
    });
  }, []);

  const deselectRow = useCallback((rowId: string) => {
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(rowId);
      return newSet;
    });
  }, []);

  const toggleRow = useCallback((rowId: string) => {
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((pageData: any[]) => {
    const pageIds = pageData.map(row => row[idKey]);
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      pageIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [idKey]);

  const deselectAll = useCallback((pageData?: any[]) => {
    if (pageData) {
      // Deselect only current page
      const pageIds = new Set(pageData.map(row => row[idKey]));
      setSelectedRowIds(prev => {
        const newSet = new Set(prev);
        pageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Clear all selections
      setSelectedRowIds(new Set());
    }
  }, [idKey]);

  const toggleSelectAll = useCallback((pageData: any[]) => {
    const pageIds = pageData.map(row => row[idKey]);
    const allPageSelected = pageIds.every(id => selectedRowIds.has(id));
    
    if (allPageSelected) {
      deselectAll(pageData);
    } else {
      selectAll(pageData);
    }
  }, [selectedRowIds, selectAll, deselectAll, idKey]);

  const clearAll = useCallback(() => {
    setSelectedRowIds(new Set());
  }, []);

  const isRowSelected = useCallback((rowId: string) => {
    return selectedRowIds.has(rowId);
  }, [selectedRowIds]);

  const isAllPageSelected = useCallback((pageData: any[]) => {
    if (pageData.length === 0) return false;
    return pageData.every(row => selectedRowIds.has(row[idKey]));
  }, [selectedRowIds, idKey]);

  const isSomePageSelected = useCallback((pageData: any[]) => {
    return pageData.some(row => selectedRowIds.has(row[idKey]));
  }, [selectedRowIds, idKey]);

  const getSelectedRows = useCallback(() => {
    return data.filter(row => selectedRowIds.has(row[idKey]));
  }, [data, selectedRowIds, idKey]);

  const getSelectedRowIds = useCallback(() => {
    return Array.from(selectedRowIds);
  }, [selectedRowIds]);

  return {
    selectedRowIds: Array.from(selectedRowIds),
    selectedCount: selectedRowIds.size,
    selectRow,
    deselectRow,
    toggleRow,
    selectAll,
    deselectAll,
    toggleSelectAll,
    clearAll,
    isRowSelected,
    isAllPageSelected,
    isSomePageSelected,
    getSelectedRows,
    getSelectedRowIds
  };
}