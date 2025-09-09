import React, { useRef, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';
import { useScrollSync } from '@/hooks/useScrollSync';

interface ResponsivePageShellProps {
  children: React.ReactNode;
  className?: string;
  headerHeight?: number; // Height of the page header in pixels
}

export function ResponsivePageShell({ 
  children, 
  className,
  headerHeight = 64 
}: ResponsivePageShellProps) {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Sync horizontal scrollbars using the custom hook
  useScrollSync(topScrollRef.current, mainScrollRef.current);

  // Update top scrollbar width to match main content
  useLayoutEffect(() => {
    const topScroll = topScrollRef.current;
    const mainScroll = mainScrollRef.current;
    
    if (!topScroll || !mainScroll) return;

    const updateTopScrollWidth = () => {
      const scrollWidth = mainScroll.scrollWidth;
      const clientWidth = mainScroll.clientWidth;
      
      if (scrollWidth > clientWidth) {
        topScroll.style.display = 'block';
        topScroll.firstElementChild && 
          ((topScroll.firstElementChild as HTMLElement).style.width = `${scrollWidth}px`);
      } else {
        topScroll.style.display = 'none';
      }
    };

    // Use ResizeObserver to track content changes
    const resizeObserver = new ResizeObserver(updateTopScrollWidth);
    resizeObserver.observe(mainScroll);

    // Initial sync
    updateTopScrollWidth();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div 
      className={cn(
        "flex flex-col overflow-hidden",
        className
      )}
      style={{ height: `calc(100vh - ${headerHeight}px)` }}
    >
      {/* Top horizontal scrollbar */}
      <div 
        ref={topScrollRef}
        className="h-3 overflow-x-auto overflow-y-hidden sticky top-0 bg-card z-20 border-b border-border"
        style={{ display: 'none' }}
        aria-label="Horizontal scroll for table"
        data-scroll-sync="top"
      >
        <div className="h-px" />
      </div>

      {/* Main content area */}
      <div 
        ref={mainScrollRef}
        className="flex-1 min-h-0 overflow-auto"
        id="table-scroll"
      >
        {children}
      </div>
    </div>
  );
}