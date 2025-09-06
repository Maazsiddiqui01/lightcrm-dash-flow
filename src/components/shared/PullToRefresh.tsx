import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false,
  className 
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef<number>(0);
  const scrollTop = useRef<number>(0);

  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    startY.current = e.touches[0].clientY;
    scrollTop.current = window.scrollY;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || window.scrollY > 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && window.scrollY === 0) {
      e.preventDefault();
      const distance = Math.min(diff * 0.5, maxPull);
      setPullDistance(distance);
      setIsPulling(distance > threshold);
    }
  }, [disabled, isRefreshing, threshold, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance > threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    setIsPulling(false);
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  return (
    <div 
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-transform duration-200 z-10",
          "bg-background/80 backdrop-blur-sm border-b border-border/50",
          pullDistance > 0 ? "translate-y-0" : "-translate-y-full"
        )}
        style={{ 
          height: Math.max(pullDistance, 0),
          opacity: pullDistance / threshold 
        }}
      >
        <div className="flex items-center space-x-2 text-muted-foreground">
          <RefreshCw 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isPulling && "text-primary",
              isRefreshing && "animate-spin"
            )} 
          />
          <span className="text-fluid-sm">
            {isRefreshing ? "Refreshing..." : isPulling ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${Math.max(pullDistance * 0.5, 0)}px)` }}
      >
        {children}
      </div>
    </div>
  );
}