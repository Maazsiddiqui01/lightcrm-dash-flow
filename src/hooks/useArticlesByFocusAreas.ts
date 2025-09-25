import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FocusAreaArticle {
  focus_area: string;
  article_link: string;
  article_date: string | null;
  last_date_to_use: string | null;
}

export function useArticlesByFocusAreas(focusAreas: string[]) {
  return useQuery({
    queryKey: ['articles_by_focus_areas', focusAreas],
    queryFn: async (): Promise<FocusAreaArticle[]> => {
      if (!focusAreas || focusAreas.length === 0) return [];

      const { data, error } = await supabase
        .from('articles')
        .select('focus_area, article_link, article_date, last_date_to_use')
        .in('focus_area', focusAreas)
        .order('article_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching articles by focus areas:', error);
        return [];
      }

      return (data || []).map(item => ({
        focus_area: item.focus_area || '',
        article_link: item.article_link || '',
        article_date: item.article_date,
        last_date_to_use: item.last_date_to_use
      }));
    },
    enabled: focusAreas && focusAreas.length > 0,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}