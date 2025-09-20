import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FocusAreaOption {
  id: string;
  label: string;
  sectorId?: string;
}

/**
 * Enhanced hook for fetching focus areas with special handling for "HC: (All)"
 * When "HC: (All)" is selected, it expands to all focus areas starting with "HC:"
 */
export const useEnhancedFocusAreas = (options: { sectorId?: string } = {}) => {
  const { sectorId } = options;
  return useQuery({
    queryKey: ['enhanced-focus-areas', sectorId],
    queryFn: async () => {
      try {
        // Fetch from the master list with active focus areas only
        let query = supabase
          .from('lg_focus_area_master')
          .select('focus_area, sector')
          .eq('is_active', true);
        
        if (sectorId && sectorId !== 'all') {
          query = query.eq('sector', sectorId);
        }
        
        const { data, error } = await query.order('focus_area');
        
        if (error) {
          console.warn('Master table fetch failed:', error);
          return [];
        }

        return data?.map(item => ({
          id: item.focus_area,
          label: item.focus_area,
          sectorId: item.sector
        })) || [];
      } catch (err) {
        console.warn('Focus areas fetch error:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Utility function to expand "HC: (All)" into actual HC focus areas
 * @param selectedFocusAreas - Array of selected focus area strings
 * @param allFocusAreas - Array of all available focus areas
 * @returns Expanded array with actual HC focus areas instead of "HC: (All)"
 */
export const expandHcAllFocusAreas = (
  selectedFocusAreas: string[],
  allFocusAreas: FocusAreaOption[]
): string[] => {
  if (!selectedFocusAreas.includes('HC: (All)')) {
    return selectedFocusAreas;
  }

  // Remove "HC: (All)" and add all HC focus areas
  const withoutHcAll = selectedFocusAreas.filter(area => area !== 'HC: (All)');
  const hcFocusAreas = allFocusAreas
    .filter(area => area.label.startsWith('HC:') && area.label !== 'HC: (All)')
    .map(area => area.label);

  // Combine and deduplicate
  return [...new Set([...withoutHcAll, ...hcFocusAreas])];
};

/**
 * Utility function to compress HC focus areas back to "HC: (All)" if all are selected
 * @param selectedFocusAreas - Array of selected focus area strings
 * @param allFocusAreas - Array of all available focus areas
 * @returns Compressed array with "HC: (All)" if all HC areas are selected
 */
export const compressHcFocusAreas = (
  selectedFocusAreas: string[],
  allFocusAreas: FocusAreaOption[]
): string[] => {
  const hcFocusAreas = allFocusAreas
    .filter(area => area.label.startsWith('HC:') && area.label !== 'HC: (All)')
    .map(area => area.label);

  const selectedHcAreas = selectedFocusAreas.filter(area => area.startsWith('HC:') && area !== 'HC: (All)');
  const nonHcAreas = selectedFocusAreas.filter(area => !area.startsWith('HC:'));

  // If all HC areas are selected, replace them with "HC: (All)"
  if (hcFocusAreas.length > 0 && selectedHcAreas.length === hcFocusAreas.length) {
    return [...nonHcAreas, 'HC: (All)'];
  }

  return selectedFocusAreas;
};