import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterValues {
  [key: string]: string[] | string | { operator: '>=' | '<='; value: number | null } | null;
}

export function useUrlFilters(defaultValues: FilterValues = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterValues>(defaultValues);

  // Load filters from URL on mount
  useEffect(() => {
    const urlFilters: FilterValues = { ...defaultValues };
    
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        
        try {
          // Try to parse as JSON first (for complex values)
          const parsedValue = JSON.parse(value);
          urlFilters[filterKey] = parsedValue;
        } catch {
          // If JSON parsing fails, treat as string array (comma-separated)
          if (value.includes(',')) {
            // Normalize array values: replace +, trim, filter empty, remove HC: (All)
            urlFilters[filterKey] = value
              .split(',')
              .map(v => decodeURIComponent(v.replace(/\+/g, ' ')).trim())
              .filter(v => v && v !== 'HC: (All)');
          } else {
            const normalized = decodeURIComponent(value.replace(/\+/g, ' ')).trim();
            urlFilters[filterKey] = (normalized === '' || normalized === 'HC: (All)') ? null : normalized;
          }
        }
      }
    }
    
    setFilters(urlFilters);
  }, []);

  // Update URL when filters change
  const updateFilters = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
    
    const newSearchParams = new URLSearchParams(searchParams);
    
    // Remove existing filter params
    Array.from(newSearchParams.keys()).forEach(key => {
      if (key.startsWith('filter_')) {
        newSearchParams.delete(key);
      }
    });
    
    // Add new filter params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        let paramValue: string;
        
        if (Array.isArray(value)) {
          if (value.length > 0) {
            paramValue = value.join(',');
          } else {
            return; // Skip empty arrays
          }
        } else if (typeof value === 'object') {
          paramValue = JSON.stringify(value);
        } else {
          paramValue = String(value);
        }
        
        if (paramValue) {
          newSearchParams.set(`filter_${key}`, paramValue);
        }
      }
    });
    
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  const clearFilters = useCallback(() => {
    updateFilters(defaultValues);
  }, [defaultValues, updateFilters]);

  const removeFilter = useCallback((key: string, value?: string) => {
    const currentValue = filters[key];
    
    if (Array.isArray(currentValue) && value) {
      // Remove specific value from array
      const newArray = currentValue.filter(v => v !== value);
      updateFilters({
        ...filters,
        [key]: newArray.length > 0 ? newArray : null
      });
    } else {
      // Remove entire filter
      const newFilters = { ...filters };
      delete newFilters[key];
      updateFilters(newFilters);
    }
  }, [filters, updateFilters]);

  return {
    filters,
    updateFilters,
    clearFilters,
    removeFilter
  };
}