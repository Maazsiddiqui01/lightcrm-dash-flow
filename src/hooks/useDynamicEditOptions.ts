import { useSectors, useFocusAreas } from './useLookups';
import { LookupOption } from './useLookups';

export interface DynamicEditOptions {
  sectors: LookupOption[];
  focusAreas: LookupOption[];
  isLoading: boolean;
}

/**
 * Centralized hook for fetching dynamic dropdown options used in edit mode.
 * This ensures all editable dropdowns (inline editing in tables) use the same
 * database-backed options as the add/edit dialogs.
 */
export function useDynamicEditOptions(): DynamicEditOptions {
  const { data: sectors = [], isLoading: isLoadingSectors } = useSectors();
  const { data: focusAreas = [], isLoading: isLoadingFocusAreas } = useFocusAreas({});

  return {
    sectors,
    focusAreas,
    isLoading: isLoadingSectors || isLoadingFocusAreas,
  };
}
