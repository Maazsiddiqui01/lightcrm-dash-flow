import React, { useRef, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';

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

  // Sync horizontal scrollbars
  useLayoutEffect(() => {
    const topScroll = topScrollRef.current;
    const mainScroll = mainScrollRef.current;
    
    if (!topScroll || !mainScroll) return;

    const syncFromTop = () => {
      if (mainScroll.scrollLeft !== topScroll.scrollLeft) {
        mainScroll.scrollLeft = topScroll.scrollLeft;
      }
    };

    const syncFromMain = () => {
      if (topScroll.scrollLeft !== mainScroll.scrollLeft) {
        topScroll.scrollLeft = mainScroll.scrollLeft;
      }
    };

    // Update top scrollbar width to match main content
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

    topScroll.addEventListener('scroll', syncFromTop);
    mainScroll.addEventListener('scroll', syncFromMain);

    // Use ResizeObserver to track content changes
    const resizeObserver = new ResizeObserver(updateTopScrollWidth);
    resizeObserver.observe(mainScroll);

    // Initial sync
    updateTopScrollWidth();

    return () => {
      topScroll.removeEventListener('scroll', syncFromTop);
      mainScroll.removeEventListener('scroll', syncFromMain);
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
        className="h-4 overflow-x-auto overflow-y-hidden sticky top-0 bg-card z-20 border-b border-border"
        style={{ display: 'none' }}
        aria-label="Horizontal scroll for table"
      >
        <div className="h-px" />
      </div>

      {/* Main content area */}
      <div 
        ref={mainScrollRef}
        className="flex-1 min-h-0 overflow-auto"
      >
        {children}
      </div>
    </div>
  );
}