import React, { useEffect, useRef, useState } from "react";

export function useScrollSync(topEl: HTMLDivElement | null, mainEl: HTMLDivElement | null) {
  const isSyncingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!topEl || !mainEl) return;
    
    const syncFromTableToTop = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      rafIdRef.current = requestAnimationFrame(() => {
        topEl.scrollLeft = mainEl.scrollLeft;
        isSyncingRef.current = false;
      });
    };

    const syncFromTopToTable = () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      rafIdRef.current = requestAnimationFrame(() => {
        mainEl.scrollLeft = topEl.scrollLeft;
        isSyncingRef.current = false;
      });
    };
    
    // Sync the width of the top scrollbar content with the actual table width
    const updateTopScrollWidth = () => {
      if (topEl && mainEl) {
        const content = topEl.firstElementChild as HTMLElement;
        if (content) {
          content.style.width = `${mainEl.scrollWidth}px`;
        }
      }
    };

    // Convert vertical wheel gestures into horizontal scroll on the top bar
    const handleTopWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        topEl.scrollLeft += e.deltaY;
      }
    };
    
    topEl.addEventListener("scroll", syncFromTopToTable, { passive: true });
    mainEl.addEventListener("scroll", syncFromTableToTop, { passive: true });
    topEl.addEventListener('wheel', handleTopWheel, { passive: true });
    
    // Update width when content changes
    updateTopScrollWidth();
    const resizeObserver = new ResizeObserver(updateTopScrollWidth);
    resizeObserver.observe(mainEl);
    const table = mainEl.querySelector('table');
    if (table) resizeObserver.observe(table);
    
    return () => {
      topEl.removeEventListener("scroll", syncFromTopToTable);
      mainEl.removeEventListener("scroll", syncFromTableToTop);
      topEl.removeEventListener('wheel', handleTopWheel);
      resizeObserver.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [topEl, mainEl]);
}

type Props = {
  /** Your table header, toolbars, etc (top pagination goes here) */
  header: React.ReactNode;
  /** The actual table element (thead/tbody) */
  table: React.ReactNode;
  /** Bottom area (optional: keep existing bottom pagination) */
  footer?: React.ReactNode;
  /** Min width so columns don't collapse */
  minTableWidth?: number; // default 1200
  className?: string;
};

export default function TableViewport({ 
  header, 
  table, 
  footer, 
  minTableWidth = 1200,
  className = ""
}: Props) {
  const topBarRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [spacerWidth, setSpacerWidth] = useState(minTableWidth);

  useScrollSync(topBarRef.current, scrollRef.current);

  // Check for debug mode
  const isDebugMode = typeof window !== 'undefined' && 
    (window.location.search.includes('debugScroll=1') || 
     process.env.NODE_ENV === 'development');

  // Measure scroll overflow and update spacer width
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const updateMeasurements = () => {
      const sW = scrollEl.scrollWidth;
      const cW = scrollEl.clientWidth;
      setHasOverflow(sW > cW);
      setSpacerWidth(sW);
    };

    updateMeasurements();
    const resizeObserver = new ResizeObserver(updateMeasurements);
    resizeObserver.observe(scrollEl);
    const table = scrollEl.querySelector('table');
    if (table) resizeObserver.observe(table);

    const handleResize = () => updateMeasurements();
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card ${className}`}>
      {/* header area (filters, export, top pagination, etc) */}
      <div className="p-3 border-b bg-muted/20">{header}</div>

      {/* sticky top horizontal scrollbar - only render when overflow exists */}
      {hasOverflow && (
        <div
          ref={topBarRef}
          className={`sticky top-0 z-20 overflow-x-auto overflow-y-hidden bg-card border-b scroll-stable ${
            isDebugMode ? 'h-6 border-2 border-red-500' : 'h-5'
          }`}
          style={{ scrollbarGutter: 'stable both-edges' }}
          aria-label="Horizontal scroll for table"
        >
          <div style={{ width: `${spacerWidth}px`, height: 1 }} />
        </div>
      )}

      {/* main scroll container for the table */}
      <div 
        ref={scrollRef} 
        className="min-h-0 flex-1 overflow-auto scroll-stable" 
        aria-label="Table scroll area"
      >
        <div style={{ minWidth: `${minTableWidth}px` }} className="relative">
          {table}
        </div>
      </div>

      {/* bottom footer (keep bottom pagination if you have it) */}
      {footer ? <div className="p-3 border-t bg-muted/20">{footer}</div> : null}
    </div>
  );
}
