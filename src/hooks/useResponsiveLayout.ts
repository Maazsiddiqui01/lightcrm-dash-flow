import { useState, useEffect, useCallback } from 'react';
import { getViewportCategory, getResponsiveConfig, RESPONSIVE_BREAKPOINTS } from '@/utils/columnManagement';

interface ResponsiveLayoutConfig {
  width: number;
  height: number;
  category: string;
  config: ReturnType<typeof getResponsiveConfig>;
  isWideScreen: boolean;
  isUltraWide: boolean;
  zoomLevel: number;
}

export function useResponsiveLayout() {
  const [layout, setLayout] = useState<ResponsiveLayoutConfig>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const category = getViewportCategory(width);
    const config = getResponsiveConfig(width);
    
    return {
      width,
      height,
      category,
      config,
      isWideScreen: width >= RESPONSIVE_BREAKPOINTS.wide,
      isUltraWide: width >= RESPONSIVE_BREAKPOINTS.ultrawide,
      zoomLevel: 1,
    };
  });

  const updateLayout = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const category = getViewportCategory(width);
    const config = getResponsiveConfig(width);
    
    // Detect zoom level (approximate)
    const zoomLevel = window.outerWidth / window.innerWidth;
    
    setLayout({
      width,
      height,
      category,
      config,
      isWideScreen: width >= RESPONSIVE_BREAKPOINTS.wide,
      isUltraWide: width >= RESPONSIVE_BREAKPOINTS.ultrawide,
      zoomLevel: Math.max(0.5, Math.min(2, zoomLevel)), // Clamp between 0.5x and 2x
    });
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(document.documentElement);

    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, [updateLayout]);

  return layout;
}