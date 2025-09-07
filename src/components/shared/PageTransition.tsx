import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [location.pathname, prefersReducedMotion]);

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out',
        !prefersReducedMotion && (isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2'
        ),
        className
      )}
    >
      {children}
    </div>
  );
}