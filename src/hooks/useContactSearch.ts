import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ContactSearchResult {
  id: string;
  full_name: string;
  first_name?: string;
  email_address: string;
  organization?: string;
  title?: string;
}

export function useContactSearch() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contact_search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) {
        return [];
      }

      const { data, error } = await supabase
        .from('contacts_raw')
        .select('id, full_name, first_name, email_address, organization, title')
        .or(`full_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,email_address.ilike.%${searchTerm}%`)
        .limit(20);
      
      if (error) throw error;
      return data as ContactSearchResult[];
    },
    enabled: searchTerm.length >= 2,
  });

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  return {
    contacts,
    isLoading,
    searchTerm,
    handleSearch,
  };
}