/**
 * Undo Stack Hook
 * Provides multi-level undo functionality with configurable history limit
 */

import { useState, useCallback } from 'react';
import { UNDO } from '@/config/performance';

export interface UndoState<T> {
  state: T;
  timestamp: number;
  label?: string;
}

export interface UndoStackHook<T> {
  /** Current state */
  current: T | null;
  /** Push a new state to the history */
  push: (state: T, label?: string) => void;
  /** Undo to the previous state */
  undo: () => T | null;
  /** Check if undo is available */
  canUndo: boolean;
  /** Get undo history count */
  historyCount: number;
  /** Clear all history */
  clear: () => void;
  /** Get the label of the last undo state */
  lastLabel: string | null;
}

/**
 * Hook for managing undo stack
 * @param maxHistory Maximum number of states to keep (default: UNDO.MAX_HISTORY)
 */
export function useUndoStack<T>(maxHistory: number = UNDO.MAX_HISTORY): UndoStackHook<T> {
  const [history, setHistory] = useState<UndoState<T>[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const push = useCallback((state: T, label?: string) => {
    setHistory(prev => {
      // Remove any states after current index (when user undoes then makes new changes)
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      const newState: UndoState<T> = {
        state: JSON.parse(JSON.stringify(state)), // Deep clone
        timestamp: Date.now(),
        label,
      };
      
      newHistory.push(newState);
      
      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        setCurrentIndex(prev => prev); // Don't increment if at max
        return newHistory;
      }
      
      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [currentIndex, maxHistory]);

  const undo = useCallback((): T | null => {
    if (currentIndex <= 0) return null;
    
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex].state;
  }, [currentIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  const canUndo = currentIndex > 0;
  const historyCount = history.length;
  const current = currentIndex >= 0 ? history[currentIndex]?.state : null;
  const lastLabel = currentIndex > 0 ? history[currentIndex - 1]?.label : null;

  return {
    current,
    push,
    undo,
    canUndo,
    historyCount,
    clear,
    lastLabel,
  };
}
