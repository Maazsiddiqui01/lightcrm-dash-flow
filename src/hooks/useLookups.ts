import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LookupOption = {
  value: string;
  label: string;
  meta?: Record<string, any>;
};

export type Sector = {
  id: string;
  label: string;
};

export type FocusArea = {
  id: string;
  label: string;
  sector_id: string;
};

// Helper function to normalize text for display and matching
export const normalizeOption = (label: string): string => {
  if (!label) return '';
  return label.trim().replace(/\s+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Helper function to find matching option by value, handling case/spacing differences
export const findMatchingOption = (options: LookupOption[], value: string): LookupOption | undefined => {
  if (!value || !options.length) return undefined;
  
  const normalizedValue = value.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // First try exact match
  let match = options.find(opt => opt.value.toLowerCase() === normalizedValue);
  if (match) return match;
  
  // Then try label match
  match = options.find(opt => opt.label.toLowerCase() === normalizedValue);
  if (match) return match;
  
  // Finally try partial matches
  return options.find(opt => 
    opt.label.toLowerCase().includes(normalizedValue) || 
    normalizedValue.includes(opt.label.toLowerCase())
  );
};

export const useSectors = () => {
  return useQuery({
    queryKey: ['lookup-sectors'],
    queryFn: async (): Promise<LookupOption[]> => {
      const { data, error } = await supabase
        .from('lookup_sectors')
        .select('id, label')
        .order('label');

      if (error) {
        console.error('Error fetching sectors:', error);
        // Fallback to constants if database fails
        return [
          { value: 'General', label: 'General' },
          { value: 'Healthcare', label: 'Healthcare' },
          { value: 'Industrials', label: 'Industrials' },
          { value: 'Services', label: 'Services' },
        ];
      }

      return (data || []).map(sector => ({
        value: sector.label,
        label: sector.label,
        meta: { id: sector.id }
      }));
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useFocusAreas = ({ sectorId }: { sectorId?: string } = {}) => {
  return useQuery({
    queryKey: ['lookup-focus-areas', sectorId],
    queryFn: async (): Promise<LookupOption[]> => {
      let query = supabase
        .from('lookup_focus_areas')
        .select('id, label, sector_id');

      if (sectorId) {
        query = query.eq('sector_id', sectorId);
      }

      const { data, error } = await query.order('label');

      if (error) {
        console.error('Error fetching focus areas:', error);
        // Fallback to basic list if database fails
        return [
          { value: 'Business Services', label: 'Business Services' },
          { value: 'Healthcare Services', label: 'Healthcare Services' },
          { value: 'Software & Technology', label: 'Software & Technology' },
        ];
      }

      return (data || []).map(focusArea => ({
        value: focusArea.label,
        label: focusArea.label,
        meta: { id: focusArea.id, sector_id: focusArea.sector_id }
      }));
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

// Combined hook for getting both sectors and focus areas
export const useLookups = () => {
  const sectorsQuery = useSectors();
  const focusAreasQuery = useFocusAreas();

  return {
    sectors: sectorsQuery,
    focusAreas: focusAreasQuery,
    isLoading: sectorsQuery.isLoading || focusAreasQuery.isLoading,
    error: sectorsQuery.error || focusAreasQuery.error,
  };
};

// Helper hook to get focus areas for a specific sector by label
export const useFocusAreasBySector = (sectorLabel?: string) => {
  const sectorsQuery = useSectors();
  
  const sectorId = sectorsQuery.data?.find(
    sector => sector.label.toLowerCase() === sectorLabel?.toLowerCase()
  )?.meta?.id;

  return useFocusAreas({ sectorId });
};