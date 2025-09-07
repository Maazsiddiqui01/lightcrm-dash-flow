import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  shortcuts?: Record<string, () => void>;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  shortcuts = {},
  enabled = true
}: UseKeyboardNavigationOptions = {}) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Handle basic navigation keys
    switch (event.key) {
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      case 'Enter':
        if (onEnter && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          onEnter();
        }
        break;
      case 'ArrowUp':
        if (onArrowUp) {
          event.preventDefault();
          onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          event.preventDefault();
          onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          event.preventDefault();
          onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          event.preventDefault();
          onArrowRight();
        }
        break;
    }

    // Handle custom shortcuts
    const shortcutKey = `${event.ctrlKey || event.metaKey ? 'ctrl+' : ''}${event.shiftKey ? 'shift+' : ''}${event.altKey ? 'alt+' : ''}${event.key.toLowerCase()}`;
    
    if (shortcuts[shortcutKey]) {
      event.preventDefault();
      shortcuts[shortcutKey]();
    }
  }, [enabled, onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return { handleKeyDown };
}