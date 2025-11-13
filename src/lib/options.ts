import { supabase } from "@/integrations/supabase/client";

export type FocusAreaOption = { focus_area: string; sector?: string | null };

/**
 * Fetch focus area options from canonical source.
 * Primary: lookup_focus_areas (curated list with sector relationships)
 * Fallback: ui_distinct_focus_areas_v (union of all focus areas from data)
 */
export async function fetchFocusAreaOptions(): Promise<FocusAreaOption[]> {
  try {
    // Try lookup_focus_areas first (canonical source)
    const { data: lookupData, error: lookupErr } = await supabase
      .from('lookup_focus_areas')
      .select('label, sector_id, lookup_sectors!inner(label)')
      .order('label', { ascending: true });

    if (!lookupErr && lookupData && lookupData.length > 0) {
      return lookupData.map((d: any) => ({ 
        focus_area: d.label, 
        sector: d.lookup_sectors?.label || null 
      }));
    }

    console.warn('lookup_focus_areas empty or failed, falling back to ui_distinct_focus_areas_v');
    
    // Fallback to ui_distinct_focus_areas_v
    const { data: viewData, error: viewErr } = await supabase
      .from('ui_distinct_focus_areas_v' as any)
      .select('focus_area')
      .order('focus_area', { ascending: true });

    if (!viewErr && viewData && viewData.length > 0) {
      return viewData.map((d: any) => ({ focus_area: d.focus_area, sector: null }));
    }
  } catch (error) {
    console.error('Error fetching focus area options:', error);
  }

  return [];
}

/**
 * Fetch sector options from canonical source.
 * Primary: lookup_sectors (curated list)
 * Fallback: ui_distinct_lg_sectors (union of all sectors from data)
 */
export async function fetchSectorOptions(): Promise<string[]> {
  try {
    // Try lookup_sectors first (canonical source)
    const { data: lookupData, error: lookupErr } = await supabase
      .from('lookup_sectors')
      .select('label')
      .order('label');

    if (!lookupErr && lookupData && lookupData.length > 0) {
      return lookupData.map((row: any) => row.label);
    }

    console.warn('lookup_sectors empty or failed, falling back to ui_distinct_lg_sectors');

    // Fallback to ui_distinct_lg_sectors view
    const { data: viewData, error: viewErr } = await supabase
      .from('ui_distinct_lg_sectors' as any)
      .select('lg_sector')
      .order('lg_sector');

    if (!viewErr && viewData && viewData.length > 0) {
      return viewData.map((row: any) => row.lg_sector);
    }
  } catch (error) {
    console.error('Error fetching sector options:', error);
  }

  return [];
}