import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFocusAreaDescriptions } from './useFocusAreaDescriptions';
import { useArticlesByFocusAreas, type FocusAreaArticle } from './useArticlesByFocusAreas';

export interface EnrichedContact {
  contact: {
    firstName: string;
    email: string;
    organization: string;
    lgEmailsCc: string;
    fullName: string;
  };
  focusAreas: string[];
  delta_type: string;
  mostRecentContact: string;
  OutreachDate: string;
  has_opps: boolean;
  opps: Array<{ 
    deal_name: string;
    ebitda_in_ms?: number | null;
    updated_at?: string | null;
  }>;
  focusMeta: Array<{
    focus_area: string;
    sector_id: string;
    description: string;
    lead1_name: string;
    lead1_email: string;
    lead2_name: string;
    lead2_email: string;
    assistant_name: string;
    assistant_email: string;
  }>;
  focusAreaDescriptions: Array<{
    focus_area: string;
    description: string;
    platform_type: string;
    sector: string;
  }>;
  articles: FocusAreaArticle[];
}

export function useContactEnriched(contactId: string | null, oppLimit: number = 3) {
  const baseQuery = useQuery({
    queryKey: ['contact_enriched', contactId, oppLimit],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase.rpc('get_contact_enriched', {
        contact_id: contactId,
        opp_limit: oppLimit,
      });

      if (error) throw error;
      return data as unknown as EnrichedContact | null;
    },
    enabled: !!contactId,
  });

  // Get focus areas from the base query to fetch descriptions and articles
  const focusAreas = baseQuery.data?.focusAreas || [];
  const descriptionsQuery = useFocusAreaDescriptions(focusAreas);
  const articlesQuery = useArticlesByFocusAreas(focusAreas);

  return {
    ...baseQuery,
    data: baseQuery.data ? {
      ...baseQuery.data,
      focusAreaDescriptions: descriptionsQuery.data || [],
      articles: articlesQuery.data || []
    } : null,
    isLoading: baseQuery.isLoading || descriptionsQuery.isLoading || articlesQuery.isLoading,
  };
}