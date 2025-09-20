import { useState, useCallback, useEffect } from 'react';

interface ColumnWidths {
  [key: string]: number;
}

interface UseColumnResizingProps {
  persistKey: string;
  defaultWidths?: ColumnWidths;
}

export function useColumnResizing({ persistKey, defaultWidths = {} }: UseColumnResizingProps) {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`columnWidths_${persistKey}`);
      if (saved) {
        try {
          return { ...defaultWidths, ...JSON.parse(saved) };
        } catch {
          return defaultWidths;
        }
      }
    }
    return defaultWidths;
  });

  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [textWrap, setTextWrap] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`textWrap_${persistKey}`);
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const updateColumnWidth = useCallback((columnKey: string, width: number) => {
    const constrainedWidth = Math.max(80, Math.min(500, width));
    setColumnWidths(prev => {
      const newWidths = { ...prev, [columnKey]: constrainedWidth };
      localStorage.setItem(`columnWidths_${persistKey}`, JSON.stringify(newWidths));
      return newWidths;
    });
  }, [persistKey]);

  const startResize = useCallback((columnKey: string) => {
    setIsResizing(columnKey);
  }, []);

  const endResize = useCallback(() => {
    setIsResizing(null);
  }, []);

  const toggleTextWrap = useCallback(() => {
    setTextWrap(prev => {
      const newValue = !prev;
      localStorage.setItem(`textWrap_${persistKey}`, JSON.stringify(newValue));
      return newValue;
    });
  }, [persistKey]);

  const resetColumnWidths = useCallback(() => {
    setColumnWidths(defaultWidths);
    localStorage.removeItem(`columnWidths_${persistKey}`);
  }, [defaultWidths, persistKey]);

  return {
    columnWidths,
    updateColumnWidth,
    isResizing,
    handleResizeStart: startResize,
    handleResizeEnd: endResize,
    textWrap,
    toggleTextWrap,
    resetColumnWidths,
  };
}