import { supabase } from "@/integrations/supabase/client";

export type FocusAreaOption = { focus_area: string; sector?: string | null };

export async function fetchFocusAreaOptions(): Promise<FocusAreaOption[]> {
  try {
    // First try to get from the view (if it exists)
    const { data: viewData, error: viewErr } = await supabase
      .from('ui_distinct_focus_areas' as any)
      .select('focus_area')
      .order('focus_area', { ascending: true });

    if (!viewErr && viewData) {
      // For now, return without sector mapping since we don't have the view yet
      return viewData.map((d: any) => ({ focus_area: d.focus_area, sector: null }));
    }
  } catch (error) {
    console.log('Focus area view not available, falling back to legacy data');
  }

  // Fallback to getting focus areas from existing data sources
  try {
    const { data, error } = await supabase
      .from('opportunities_raw')
      .select('lg_focus_area')
      .not('lg_focus_area', 'is', null)
      .neq('lg_focus_area', '');

    if (error) throw error;

    const uniqueValues = new Set<string>();
    (data || []).forEach((row: any) => {
      const value = row.lg_focus_area?.toString().trim();
      if (value) {
        // Split comma-separated values
        const splitValues = value.split(',').map((v: string) => v.trim()).filter((v: string) => v);
        splitValues.forEach((splitValue: string) => uniqueValues.add(splitValue));
      }
    });

    return Array.from(uniqueValues)
      .sort()
      .map(focus_area => ({ focus_area, sector: null }));
  } catch (error) {
    console.error('Error fetching focus area options:', error);
    return [];
  }
}

export async function fetchSectorOptions(): Promise<string[]> {
  try {
    // Get sectors from opportunities and contacts data
    const [oppData, contactData] = await Promise.all([
      supabase
        .from('opportunities_raw')
        .select('sector')
        .not('sector', 'is', null)
        .neq('sector', ''),
      supabase
        .from('contacts_raw')
        .select('lg_sector')
        .not('lg_sector', 'is', null)
        .neq('lg_sector', '')
    ]);

    const uniqueSectors = new Set<string>();
    
    if (oppData.data) {
      oppData.data.forEach((row: any) => {
        const value = row.sector?.toString().trim();
        if (value) uniqueSectors.add(value);
      });
    }

    if (contactData.data) {
      contactData.data.forEach((row: any) => {
        const value = row.lg_sector?.toString().trim();
        if (value) uniqueSectors.add(value);
      });
    }

    return Array.from(uniqueSectors).sort();
  } catch (error) {
    console.error('Error fetching sector options:', error);
    return [];
  }
}