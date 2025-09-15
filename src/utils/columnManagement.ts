import { ColumnDef } from "@/components/shared/AdvancedTable";

// Enhanced responsive breakpoints with ultra-wide support
export const RESPONSIVE_BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1920,
  ultrawide: 2560,
  fourK: 3840,
} as const;

// Column priorities for responsive hiding (higher priority = shown longer)
export const getColumnPriorities = (tableType: 'contacts' | 'opportunities' | 'interactions' | 'tom'): Record<string, number> => {
  const basePriorities = {
    contacts: {
      'full_name': 100, // Always visible (sticky)
      'email': 90,
      'phone': 80,
      'company': 75,
      'status': 70,
      'deal_value': 65,
      'last_contact': 60,
      'source': 55,
      'industry': 50,
      'notes': 45,
      'created_at': 40,
      'url': 30,
      'category': 25,
    },
    opportunities: {
      'deal_name': 100, // Always visible (sticky)
      'actions': 95, // Actions column should always be visible
      'amount': 90,
      'stage': 85,
      'contact_name': 80,
      'company': 75,
      'probability': 70,
      'close_date': 65,
      'source': 60,
      'deal_type': 55,
      'created_at': 50,
      'updated_at': 45,
      'notes': 40,
      'lg_focus_area': 35,
      'sector': 30,
      'tier': 25,
      'platform_add_on': 20,
      'ownership_type': 15,
      'investment_professional_point_person_1': 10,
      'investment_professional_point_person_2': 5,
    },
    interactions: {
      'subject': 100, // Always visible (sticky)
      'contact_name': 90,
      'type': 85,
      'date': 80,
      'status': 75,
      'priority': 70,
      'company': 65,
      'outcome': 60,
      'follow_up_date': 55,
      'created_at': 50,
      'notes': 45,
    },
    tom: {
      'deal_source_company': 100, // Always visible (sticky)
      'deal_name': 95,
      'contact_name': 90,
      'amount': 85,
      'stage': 80,
      'probability': 75,
      'close_date': 70,
      'source': 65,
      'created_at': 60,
      'updated_at': 55,
      'notes': 50,
    }
  };

  return basePriorities[tableType] || {};
};

// Dynamic column width calculation based on screen size
export const getAdaptiveColumnWidth = (availableWidth: number, columnCount: number) => {
  const padding = 48; // Account for table padding
  const actionColumnWidth = 120; // Fixed width for action columns
  const stickyColumnWidth = Math.min(250, availableWidth * 0.15); // 15% of width, max 250px
  
  const availableForDataColumns = availableWidth - padding - stickyColumnWidth - actionColumnWidth;
  const minColumnWidth = 120;
  const maxColumnWidth = 300;
  
  // Calculate ideal column width
  const idealWidth = availableForDataColumns / (columnCount - 1); // -1 for sticky column
  
  return Math.max(minColumnWidth, Math.min(maxColumnWidth, idealWidth));
};

// Enhanced responsive column calculation with dynamic width-based logic
export const getResponsiveColumns = <T>(
  columns: ColumnDef<T>[], 
  availableWidth: number,
  tableType: 'contacts' | 'opportunities' | 'interactions' | 'tom'
): ColumnDef<T>[] => {
  const priorities = getColumnPriorities(tableType);
  
  // Calculate optimal number of columns based on available width
  const baseColumnWidth = 150; // Increased from 120px for better readability
  const stickyColumnWidth = Math.min(250, availableWidth * 0.15);
  const actionColumnWidth = 120;
  const padding = 48;
  
  const availableForColumns = availableWidth - stickyColumnWidth - actionColumnWidth - padding;
  const maxPossibleColumns = Math.floor(availableForColumns / baseColumnWidth);
  
  // Dynamic column limits based on screen size
  const getMaxColumns = (width: number) => {
    if (width >= RESPONSIVE_BREAKPOINTS.fourK) return Math.min(25, maxPossibleColumns); // 4K displays
    if (width >= RESPONSIVE_BREAKPOINTS.ultrawide) return Math.min(20, maxPossibleColumns); // Ultra-wide
    if (width >= RESPONSIVE_BREAKPOINTS.wide) return Math.min(15, maxPossibleColumns); // Wide screens
    if (width >= RESPONSIVE_BREAKPOINTS.desktop) return Math.min(10, maxPossibleColumns); // Desktop
    if (width >= RESPONSIVE_BREAKPOINTS.laptop) return Math.min(7, maxPossibleColumns); // Laptop
    if (width >= RESPONSIVE_BREAKPOINTS.tablet) return Math.min(5, maxPossibleColumns); // Tablet
    return 3; // Mobile
  };
  
  const maxColumns = getMaxColumns(availableWidth);
  
  // Sort columns by priority (descending)
  const sortedColumns = [...columns].sort((a, b) => {
    const priorityA = priorities[a.key] || 0;
    const priorityB = priorities[b.key] || 0;
    return priorityB - priorityA;
  });

  return columns.map(col => {
    // Always show non-hidable columns
    if (col.enableHiding === false) {
      return { ...col, visible: true };
    }

    // Respect explicit user overrides
    if (col.visible === false) return { ...col, visible: false };
    if (col.visible === true) return { ...col, visible: true };
    
    const priority = priorities[col.key] || 0;
    const sortedIndex = sortedColumns.findIndex(sortedCol => sortedCol.key === col.key);
    
    // Always show critical columns (priority >= 100) or within column limit
    const shouldShow = priority >= 100 || sortedIndex < maxColumns;
    
    return {
      ...col,
      visible: shouldShow
    };
  });
};

// Get responsive configuration with enhanced breakpoints
export const getResponsiveConfig = (width: number) => {
  if (width >= RESPONSIVE_BREAKPOINTS.fourK) {
    return { maxColumns: 25, compactMode: false, density: 'comfortable' };
  } else if (width >= RESPONSIVE_BREAKPOINTS.ultrawide) {
    return { maxColumns: 20, compactMode: false, density: 'comfortable' };
  } else if (width >= RESPONSIVE_BREAKPOINTS.wide) {
    return { maxColumns: 15, compactMode: false, density: 'normal' };
  } else if (width >= RESPONSIVE_BREAKPOINTS.desktop) {
    return { maxColumns: 10, compactMode: false, density: 'normal' };
  } else if (width >= RESPONSIVE_BREAKPOINTS.laptop) {
    return { maxColumns: 7, compactMode: false, density: 'normal' };
  } else if (width >= RESPONSIVE_BREAKPOINTS.tablet) {
    return { maxColumns: 5, compactMode: true, density: 'compact' };
  } else {
    return { maxColumns: 3, compactMode: true, density: 'compact' };
  }
};

// Viewport detection utilities
export const getViewportCategory = (width: number) => {
  if (width >= RESPONSIVE_BREAKPOINTS.fourK) return 'fourK';
  if (width >= RESPONSIVE_BREAKPOINTS.ultrawide) return 'ultrawide';
  if (width >= RESPONSIVE_BREAKPOINTS.wide) return 'wide';
  if (width >= RESPONSIVE_BREAKPOINTS.desktop) return 'desktop';
  if (width >= RESPONSIVE_BREAKPOINTS.laptop) return 'laptop';
  if (width >= RESPONSIVE_BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
};

// Adaptive row height based on screen size and zoom level
export const getAdaptiveRowHeight = (width: number, zoomLevel: number = 1) => {
  const baseHeight = 52;
  const category = getViewportCategory(width);
  
  const heightMultipliers = {
    mobile: 1.2,
    tablet: 1.1,
    laptop: 1.0,
    desktop: 1.0,
    wide: 0.95,
    ultrawide: 0.9,
    fourK: 0.85,
  };
  
  const adjustedHeight = baseHeight * heightMultipliers[category];
  
  // Adjust for zoom level (inverse relationship for better usability)
  return Math.round(adjustedHeight / zoomLevel);
};