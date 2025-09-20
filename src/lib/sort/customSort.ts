import { SortLevel } from '@/components/shared/MultiSortDialog';

// Parse number from text (handles currency, percentages, etc.)
export function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Get comparable value for sorting
export function getComparableValue(value: any, columnKey: string): any {
  if (value === null || value === undefined) return null;
  
  // Handle date columns - convert to timestamp for proper sorting
  if (columnKey.includes('date') || columnKey.includes('_at') || 
      columnKey.includes('contact') || columnKey === 'outreach_date' ||
      columnKey === 'most_recent_contact' || columnKey === 'latest_contact_email' ||
      columnKey === 'latest_contact_meeting' || columnKey === 'occurred_at' ||
      columnKey === 'created_at' || columnKey === 'updated_at') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }
  
  // Handle numeric columns - more comprehensive detection
  if (columnKey.includes('ebitda') || columnKey.includes('delta') || 
      columnKey.includes('count') || columnKey.includes('number') ||
      columnKey.includes('days_') || columnKey.includes('of_') ||
      columnKey.includes('no_') || columnKey.includes('all_') ||
      columnKey === 'total_of_contacts' || columnKey === 'revenue' ||
      columnKey === 'est_deal_size' || columnKey === 'est_lg_equity_invest' ||
      columnKey === 'minutes' || columnKey.endsWith('_count') ||
      columnKey.endsWith('_size') || columnKey.endsWith('_amount') ||
      columnKey === 'days_over_under_max_lag') {
    return parseNumber(value);
  }
  
  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  
  // Default to string comparison (case insensitive)
  return String(value).toLowerCase();
}

// Create a comparator function for a single sort level
export function createLevelComparator<T>(level: SortLevel) {
  return (a: T, b: T): number => {
    const valueA = (a as any)[level.id];
    const valueB = (b as any)[level.id];
    
    // Handle custom order
    if (level.custom && level.custom.length > 0) {
      const customOrder = level.custom;
      const indexA = customOrder.indexOf(String(valueA));
      const indexB = customOrder.indexOf(String(valueB));
      
      // Both in custom list
      if (indexA !== -1 && indexB !== -1) {
        const result = indexA - indexB;
        return level.desc ? -result : result;
      }
      
      // Only A in custom list (A comes first)
      if (indexA !== -1 && indexB === -1) {
        return level.desc ? 1 : -1;
      }
      
      // Only B in custom list (B comes first)
      if (indexA === -1 && indexB !== -1) {
        return level.desc ? -1 : 1;
      }
      
      // Neither in custom list, fall through to regular comparison
    }
    
    // Get comparable values
    const compA = getComparableValue(valueA, level.id);
    const compB = getComparableValue(valueB, level.id);
    
    // Handle nulls (always last for asc, first for desc)
    if (compA === null && compB === null) return 0;
    if (compA === null) return level.desc ? -1 : 1;
    if (compB === null) return level.desc ? 1 : -1;
    
    // Compare values
    let result = 0;
    if (compA < compB) result = -1;
    else if (compA > compB) result = 1;
    
    return level.desc ? -result : result;
  };
}

// Create a multi-level comparator from sort levels
export function createMultiSortComparator<T>(sortLevels: SortLevel[]) {
  if (sortLevels.length === 0) return () => 0;
  
  const comparators = sortLevels.map(createLevelComparator);
  
  return (a: T, b: T): number => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}

// Apply client-side sorting (always apply for proper type handling)
export function applyClientSort<T>(data: T[], sortLevels: SortLevel[]): T[] {
  if (sortLevels.length === 0) return data;
  
  const comparator = createMultiSortComparator(sortLevels);
  return [...data].sort(comparator);
}

// Build Supabase order clauses (skip levels with custom orders)
export function buildSupabaseOrder(sortLevels: SortLevel[]): Array<{ column: string; ascending: boolean }> {
  return sortLevels
    .filter(level => !level.custom || level.custom.length === 0)
    .map(level => ({
      column: level.id,
      ascending: !level.desc,
    }));
}

// Get sort state persistence key
export function getSortStorageKey(tableName: string): string {
  return `sort:${tableName}`;
}

// Load sort state from localStorage
export function loadSortState(tableName: string): SortLevel[] {
  try {
    const key = getSortStorageKey(tableName);
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save sort state to localStorage
export function saveSortState(tableName: string, sortLevels: SortLevel[]): void {
  try {
    const key = getSortStorageKey(tableName);
    localStorage.setItem(key, JSON.stringify(sortLevels));
  } catch (error) {
    console.warn('Failed to save sort state:', error);
  }
}

// Clear sort state from localStorage
export function clearSortState(tableName: string): void {
  try {
    const key = getSortStorageKey(tableName);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear sort state:', error);
  }
}
