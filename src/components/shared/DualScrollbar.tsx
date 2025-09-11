import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DualScrollbarProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
}

export function DualScrollbar({ children, className, minWidth = 1200 }: DualScrollbarProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(minWidth);
  const isSyncingRef = useRef(false);

  // Sync scroll positions
  useEffect(() => {
    const topEl = topScrollRef.current;
    const mainEl = mainScrollRef.current;
    
    if (!topEl || !mainEl) return;

    const syncFromTop = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      requestAnimationFrame(() => {
        mainEl.scrollLeft = topEl.scrollLeft;
        isSyncingRef.current = false;
      });
    };

    const syncFromMain = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      requestAnimationFrame(() => {
        topEl.scrollLeft = mainEl.scrollLeft;
        isSyncingRef.current = false;
      });
    };

    topEl.addEventListener('scroll', syncFromTop, { passive: true });
    mainEl.addEventListener('scroll', syncFromMain, { passive: true });

    return () => {
      topEl.removeEventListener('scroll', syncFromTop);
      mainEl.removeEventListener('scroll', syncFromMain);
    };
  }, []);

  // Update scroll width when content changes
  useEffect(() => {
    const mainEl = mainScrollRef.current;
    if (!mainEl) return;

    const updateScrollWidth = () => {
      setScrollWidth(Math.max(mainEl.scrollWidth, minWidth));
    };

    updateScrollWidth();
    
    const resizeObserver = new ResizeObserver(updateScrollWidth);
    resizeObserver.observe(mainEl);
    
    // Also observe the table inside if it exists
    const table = mainEl.querySelector('table');
    if (table) {
      resizeObserver.observe(table);
    }

    return () => resizeObserver.disconnect();
  }, [minWidth]);

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      {/* Top sticky scrollbar - always visible */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div
          ref={topScrollRef}
          className="overflow-x-auto overflow-y-hidden h-4"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
      </div>

      {/* Main content with bottom scrollbar */}
      <div
        ref={mainScrollRef}
        className="overflow-auto flex-1"
        style={{ minWidth }}
      >
        {children}
      </div>
    </div>
  );
}