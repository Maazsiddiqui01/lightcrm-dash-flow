import React, { useEffect, useRef } from "react";

export function useScrollSync(topEl: HTMLDivElement | null, mainEl: HTMLDivElement | null) {
  useEffect(() => {
    if (!topEl || !mainEl) return;
    
    const onTop = () => { 
      mainEl.scrollLeft = topEl.scrollLeft; 
    };
    const onMain = () => { 
      topEl.scrollLeft = mainEl.scrollLeft; 
    };
    
    topEl.addEventListener("scroll", onTop, { passive: true });
    mainEl.addEventListener("scroll", onMain, { passive: true });
    
    return () => {
      topEl.removeEventListener("scroll", onTop);
      mainEl.removeEventListener("scroll", onMain);
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

  useScrollSync(topBarRef.current, scrollRef.current);

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card ${className}`}>
      {/* header area (filters, export, top pagination, etc) */}
      <div className="p-3 border-b bg-muted/20">{header}</div>

      {/* sticky top horizontal scrollbar */}
      <div
        ref={topBarRef}
        className="sticky top-0 z-20 h-4 overflow-x-auto overflow-y-hidden bg-card border-b"
        aria-label="Horizontal scroll"
      >
        <div style={{ width: `${minTableWidth}px`, height: 1 }} />
      </div>

      {/* main scroll container for the table */}
      <div 
        ref={scrollRef} 
        className="min-h-0 flex-1 overflow-auto" 
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
