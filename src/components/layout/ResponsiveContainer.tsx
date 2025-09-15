import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = 'none',
  padding = 'md'
}: ResponsiveContainerProps) {
  const layout = useResponsiveLayout();

  const getMaxWidthClass = () => {
    if (maxWidth === 'none') return 'max-w-none w-full';
    
    const widthClasses = {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md', 
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      '3xl': 'max-w-[2560px]',
      '4xl': 'max-w-[3840px]'
    };
    
    return cn(widthClasses[maxWidth], 'mx-auto w-full');
  };

  const getPaddingClass = () => {
    const paddingClasses = {
      none: '',
      sm: layout.isUltraWide ? 'px-8' : layout.isWideScreen ? 'px-6' : 'px-4',
      md: layout.isUltraWide ? 'px-12' : layout.isWideScreen ? 'px-8' : 'px-4',
      lg: layout.isUltraWide ? 'px-16' : layout.isWideScreen ? 'px-12' : 'px-6'
    };
    
    return paddingClasses[padding];
  };

  return (
    <div className={cn(
      getMaxWidthClass(),
      getPaddingClass(),
      className
    )}>
      {children}
    </div>
  );
}