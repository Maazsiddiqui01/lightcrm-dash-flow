import { useState, useEffect, useCallback } from 'react';

interface TableLayoutOptions {
  headerHeight?: number;
  footerHeight?: number;
  padding?: number;
}

export function useTableLayout(options: TableLayoutOptions = {}) {
  const { headerHeight = 64, footerHeight = 60, padding = 24 } = options;
  const [availableHeight, setAvailableHeight] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);

  const updateHeight = useCallback(() => {
    if (!containerRef) return;

    const rect = containerRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const topOffset = rect.top;
    const calculatedHeight = viewportHeight - topOffset - footerHeight - padding;
    
    setAvailableHeight(Math.max(300, calculatedHeight)); // Minimum 300px
  }, [containerRef, footerHeight, padding]);

  useEffect(() => {
    updateHeight();
    
    const resizeObserver = new ResizeObserver(updateHeight);
    const mutationObserver = new MutationObserver(updateHeight);
    
    if (containerRef) {
      resizeObserver.observe(containerRef);
      mutationObserver.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true 
      });
    }

    window.addEventListener('resize', updateHeight);
    window.addEventListener('scroll', updateHeight);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('scroll', updateHeight);
    };
  }, [updateHeight, containerRef]);

  return {
    availableHeight,
    containerRef: setContainerRef,
    maxTableHeight: Math.max(300, availableHeight - headerHeight),
  };
}