import { ColumnDef } from "@/components/shared/AdvancedTable";

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

// Calculate which columns should be hidden based on available width
export const getResponsiveColumns = <T>(
  columns: ColumnDef<T>[], 
  availableWidth: number,
  tableType: 'contacts' | 'opportunities' | 'interactions' | 'tom'
): ColumnDef<T>[] => {
  const priorities = getColumnPriorities(tableType);
  
  // Estimate column widths
  const estimatedMinWidth = 1200; // Base minimum width for all columns
  
  if (availableWidth >= estimatedMinWidth) {
    // Show all columns if we have enough space
    return columns.map(col => ({ ...col, visible: true }));
  }

  // Sort columns by priority (descending)
  const sortedColumns = [...columns].sort((a, b) => {
    const priorityA = priorities[a.key] || 0;
    const priorityB = priorities[b.key] || 0;
    return priorityB - priorityA;
  });

  // Calculate how many columns we can fit
  const baseColumnWidth = 120;
  const stickyColumnWidth = 200; // First column is usually wider
  const maxColumns = Math.floor((availableWidth - stickyColumnWidth) / baseColumnWidth) + 1;

  return columns.map(col => {
    // Always show columns that have enableHiding: false
    if (col.enableHiding === false) {
      return { ...col, visible: true };
    }
    
    const priority = priorities[col.key] || 0;
    const sortedIndex = sortedColumns.findIndex(sortedCol => sortedCol.key === col.key);
    
    return {
      ...col,
      visible: priority >= 100 || sortedIndex < maxColumns // Always show high priority or within limit
    };
  });
};

// Breakpoints for responsive behavior
export const RESPONSIVE_BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1536,
} as const;

// Get responsive column configuration
export const getResponsiveConfig = (width: number) => {
  if (width < RESPONSIVE_BREAKPOINTS.tablet) {
    return { maxColumns: 3, compactMode: true };
  } else if (width < RESPONSIVE_BREAKPOINTS.laptop) {
    return { maxColumns: 5, compactMode: true };
  } else if (width < RESPONSIVE_BREAKPOINTS.desktop) {
    return { maxColumns: 7, compactMode: false };
  } else {
    return { maxColumns: 10, compactMode: false };
  }
};