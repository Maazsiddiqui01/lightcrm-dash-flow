import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SECTORS, FOCUS_AREAS } from '@/constants/lookups';

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

// Helper function to find matching option by value with fuzzy matching
export const findMatchingOption = (options: LookupOption[], value: string): LookupOption | undefined => {
  if (!value || !options?.length) return undefined;
  
  const normalized = value.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Exact match first
  const exact = options.find(opt => opt.value.toLowerCase().trim().replace(/\s+/g, ' ') === normalized);
  if (exact) return exact;
  
  // Label match
  const labelMatch = options.find(opt => opt.label.toLowerCase().trim().replace(/\s+/g, ' ') === normalized);
  if (labelMatch) return labelMatch;
  
  // Partial match fallback
  return options.find(opt => 
    opt.label.toLowerCase().includes(normalized) || 
    normalized.includes(opt.label.toLowerCase())
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
        console.warn('Failed to fetch sectors from lookup table, using fallback:', error);
        // Fallback to constants if database fails
        return SECTORS.map(sector => ({
          value: sector.label,
          label: sector.label,
          meta: { id: sector.id }
        }));
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
        .select('id, label, sector_id, lookup_sectors!inner(label)');

      if (sectorId) {
        query = query.eq('sector_id', sectorId);
      }

      const { data, error } = await query.order('label');

      if (error) {
        console.warn('Failed to fetch focus areas from lookup table, using fallback:', error);
        // Fallback to constants if database fails
        let fallbackAreas = FOCUS_AREAS;
        
        // Filter by sector if specified
        if (sectorId) {
          fallbackAreas = FOCUS_AREAS.filter(area => area.sector_id === sectorId);
        }
        
        const result = fallbackAreas.map(area => ({
          value: area.label,
          label: area.label,
          meta: { 
            id: area.id, 
            sector_id: area.sector_id,
            sector_label: SECTORS.find(s => s.id === area.sector_id)?.label
          }
        }));

        // Add HC: (All) as a virtual option for group selection if there are HC focus areas
        const hasHcOptions = result.some(fa => fa.value.startsWith('HC:'));
        if (hasHcOptions) {
          // Insert HC: (All) after the first HC option for logical grouping
          const hcIndex = result.findIndex(fa => fa.value.startsWith('HC:'));
          if (hcIndex >= 0) {
            result.splice(hcIndex, 0, { 
              value: 'HC: (All)', 
              label: 'HC: (All)', 
              meta: { id: 'hc-all-virtual', sector_id: '', sector_label: '' } 
            });
          }
        }
        
        return result;
      }

      const result = (data || []).map(focusArea => ({
        value: focusArea.label,
        label: focusArea.label,
        meta: { 
          id: focusArea.id, 
          sector_id: focusArea.sector_id,
          sector_label: (focusArea.lookup_sectors as any)?.label
        }
      }));

      // Add HC: (All) as a virtual option for group selection if there are HC focus areas
      const hasHcOptions = result.some(fa => fa.value.startsWith('HC:'));
      if (hasHcOptions) {
        // Insert HC: (All) after the first HC option for logical grouping
        const hcIndex = result.findIndex(fa => fa.value.startsWith('HC:'));
        if (hcIndex >= 0) {
          result.splice(hcIndex, 0, { 
            value: 'HC: (All)', 
            label: 'HC: (All)', 
            meta: { id: 'hc-all-virtual', sector_id: '', sector_label: '' } 
          });
        }
      }

      return result;
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