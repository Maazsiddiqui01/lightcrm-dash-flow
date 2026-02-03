import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OpportunitySearchResult {
  id: string;
  deal_name: string;
  sector: string | null;
  status: string | null;
  deal_source_individual_1: string | null;
  deal_source_individual_2: string | null;
  deal_source_contact_1_id: string | null;
  deal_source_contact_2_id: string | null;
}

export function useAllOpportunitiesSearch(searchTerm: string, enabled: boolean = true) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return useQuery({
    queryKey: ['opportunities-search', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('id, deal_name, sector, status, deal_source_individual_1, deal_source_individual_2, deal_source_contact_1_id, deal_source_contact_2_id')
        .order('deal_name')
        .limit(50);

      if (debouncedSearch.trim()) {
        query = query.ilike('deal_name', `%${debouncedSearch}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OpportunitySearchResult[];
    },
    enabled: enabled && debouncedSearch.length >= 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Simple hook for fetching initial opportunities without debounce
export function useAllOpportunities(enabled: boolean = true) {
  return useQuery({
    queryKey: ['all-opportunities-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities_raw')
        .select('id, deal_name, sector, status, deal_source_individual_1, deal_source_individual_2, deal_source_contact_1_id, deal_source_contact_2_id')
        .order('deal_name')
        .limit(200);

      if (error) throw error;
      return data as OpportunitySearchResult[];
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
