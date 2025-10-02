import { supabase } from '@/integrations/supabase/client';

/**
 * Focus area description interface
 */
export interface FocusAreaDescription {
  focusArea: string;
  description: string;
  sector: string;
  platformAddon: string;
}

/**
 * Opportunity data interface
 */
export interface OpportunityData {
  id: string;
  dealName: string;
  ebitda: number | null;
  tier: string | null;
  status: string | null;
  sector: string | null;
}

/**
 * Contact metadata interface
 */
export interface ContactMetadata {
  focusAreas: string[];
  focusAreaDescriptions: FocusAreaDescription[];
  topOpportunities: OpportunityData[];
  lgLeads: string[];
  lgAssistants: string[];
}

/**
 * Fetch focus area descriptions for given focus areas
 */
export async function fetchFocusAreaDescriptions(
  focusAreas: string[]
): Promise<FocusAreaDescription[]> {
  if (focusAreas.length === 0) return [];

  const { data, error } = await supabase
    .from('focus_area_description' as any)
    .select('*')
    .in('LG Focus Area', focusAreas);

  if (error) {
    console.error('Error fetching focus area descriptions:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    focusArea: item['LG Focus Area'],
    description: item.Description || '',
    sector: item['LG Sector'] || '',
    platformAddon: item['Platform / Add-On'] || '',
  }));
}

/**
 * Fetch top opportunities for a contact by full name
 */
export async function fetchTopOpportunities(
  fullName: string,
  limit: number = 3
): Promise<OpportunityData[]> {
  if (!fullName) return [];

  const { data, error } = await supabase
    .from('opportunities_raw' as any)
    .select('id, deal_name, ebitda_in_ms, tier, status, sector')
    .or(`deal_source_individual_1.eq.${fullName},deal_source_individual_2.eq.${fullName}`)
    .order('ebitda_in_ms', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching opportunities:', error);
    return [];
  }

  return (data || []).map((opp: any) => ({
    id: opp.id,
    dealName: opp.deal_name,
    ebitda: opp.ebitda_in_ms,
    tier: opp.tier,
    status: opp.status,
    sector: opp.sector,
  }));
}

/**
 * Parse LG leads and assistants from focus areas
 */
export async function fetchLeadsAndAssistants(
  focusAreas: string[]
): Promise<{ leads: string[]; assistants: string[] }> {
  if (focusAreas.length === 0) {
    return { leads: [], assistants: [] };
  }

  const { data, error } = await supabase
    .from('lg_focus_area_directory' as any)
    .select('lead1_name, lead2_name, assistant_name')
    .in('focus_area', focusAreas);

  if (error) {
    console.error('Error fetching leads and assistants:', error);
    return { leads: [], assistants: [] };
  }

  const leads = new Set<string>();
  const assistants = new Set<string>();

  (data || []).forEach((row: any) => {
    if (row.lead1_name) leads.add(row.lead1_name);
    if (row.lead2_name) leads.add(row.lead2_name);
    if (row.assistant_name) assistants.add(row.assistant_name);
  });

  return {
    leads: Array.from(leads),
    assistants: Array.from(assistants),
  };
}

/**
 * Fetch all contact metadata in a single optimized call
 */
export async function fetchContactMetadata(
  fullName: string,
  focusAreasString: string
): Promise<ContactMetadata> {
  // Parse focus areas
  const focusAreas = focusAreasString
    ? focusAreasString.split(',').map(fa => fa.trim()).filter(Boolean)
    : [];

  // Fetch all data in parallel
  const [descriptions, opportunities, leadsAssistants] = await Promise.all([
    fetchFocusAreaDescriptions(focusAreas),
    fetchTopOpportunities(fullName),
    fetchLeadsAndAssistants(focusAreas),
  ]);

  return {
    focusAreas,
    focusAreaDescriptions: descriptions,
    topOpportunities: opportunities,
    lgLeads: leadsAssistants.leads,
    lgAssistants: leadsAssistants.assistants,
  };
}

/**
 * Fetch all available phrases for a contact with rotation applied
 */
export async function fetchAvailablePhrasesForContact(
  contactId: string,
  categories: string[]
): Promise<Record<string, any[]>> {
  if (categories.length === 0) return {};

  // Get all global phrases for these categories
  const { data: phrases, error } = await supabase
    .from('phrase_library' as any)
    .select('*')
    .eq('is_global', true)
    .in('category', categories);

  if (error) {
    console.error('Error fetching phrases:', error);
    return {};
  }

  // Get rotation log for this contact
  const { data: usedLogs } = await supabase
    .from('phrase_rotation_log' as any)
    .select('phrase_id')
    .eq('contact_id', contactId)
    .order('used_at', { ascending: false })
    .limit(30);

  const usedIds = new Set(usedLogs?.map((log: any) => log.phrase_id) || []);

  // Group by category and filter out used
  const grouped: Record<string, any[]> = {};
  const phrasesArray = (phrases as any[]) || [];
  
  categories.forEach(cat => {
    const categoryPhrases = phrasesArray.filter((p: any) => p.category === cat);
    grouped[cat] = categoryPhrases.filter((p: any) => !usedIds.has(p.id));
    
    // If all used, include all
    if (grouped[cat].length === 0) {
      grouped[cat] = categoryPhrases;
    }
  });

  return grouped;
}
