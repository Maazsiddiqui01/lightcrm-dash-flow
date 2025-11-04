import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileStatsGridProps {
  children: ReactNode;
  className?: string;
}

export function MobileStatsGrid({ children, className }: MobileStatsGridProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    // Desktop: Standard grid layout
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {children}
      </div>
    );
  }

  // Mobile: Horizontal scroll with snap
  return (
    <div className={cn("relative -mx-4 px-4", className)}>
      <div className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scrollbar-visible scroll-smooth -webkit-overflow-scrolling-touch">
        {Array.isArray(children) ? children.map((child, index) => (
          <div 
            key={index} 
            className="flex-none w-[85%] snap-start first:ml-0"
          >
            {child}
          </div>
        )) : (
          <div className="flex-none w-[85%] snap-start">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
