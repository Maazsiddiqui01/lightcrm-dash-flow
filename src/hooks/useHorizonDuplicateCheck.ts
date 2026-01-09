import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

interface DuplicateMatch {
  id: string;
  name: string;
  subtitle?: string;
}

interface UseDuplicateCheckResult {
  matches: DuplicateMatch[];
  isExactMatch: boolean;
  isLoading: boolean;
}

/**
 * Hook to check for duplicate GP or Company names as user types
 * Provides live search with debounce and exact match detection
 */
export function useHorizonDuplicateCheck(
  table: 'lg_horizons_gps' | 'lg_horizons_companies',
  searchValue: string,
  debounceMs: number = 300
): UseDuplicateCheckResult {
  const debouncedSearch = useDebounce(searchValue, debounceMs);
  
  const nameField = table === 'lg_horizons_gps' ? 'gp_name' : 'company_name';
  const subtitleField = table === 'lg_horizons_gps' ? 'aum' : 'sector';

  const { data, isLoading } = useQuery({
    queryKey: ['horizon-duplicate-check', table, debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch.trim() || debouncedSearch.length < 2) {
        return [];
      }

      const { data: results, error } = await supabase
        .from(table)
        .select(`id, ${nameField}, ${subtitleField}`)
        .ilike(nameField, `%${debouncedSearch}%`)
        .limit(10);

      if (error) {
        console.error('Error checking duplicates:', error);
        return [];
      }

      return (results || []).map((r: any) => ({
        id: r.id,
        name: r[nameField],
        subtitle: r[subtitleField] || undefined,
      }));
    },
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  const matches = data || [];
  
  const isExactMatch = useMemo(() => {
    if (!debouncedSearch.trim()) return false;
    return matches.some(
      (m) => m.name.toLowerCase() === debouncedSearch.toLowerCase()
    );
  }, [matches, debouncedSearch]);

  return {
    matches,
    isExactMatch,
    isLoading: isLoading && debouncedSearch.trim().length >= 2,
  };
}

/**
 * Hook to get all GPs for parent GP selection (with id for linking)
 */
export function useHorizonGpsForLinking() {
  return useQuery({
    queryKey: ['horizon-gps-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lg_horizons_gps')
        .select('id, gp_name, aum')
        .order('gp_name');
      
      if (error) {
        console.error('Error fetching GPs for linking:', error);
        return [];
      }
      
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}
