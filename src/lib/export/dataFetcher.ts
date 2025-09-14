import { supabase } from '@/integrations/supabase/client';
import { chunk } from './csvUtils';

/**
 * Collect filtered IDs for export
 */
export async function collectFilteredIds({ 
  page, 
  filters, 
  sortLevels 
}: { 
  page: 'contacts' | 'opportunities';
  filters?: any;
  sortLevels?: any[];
}): Promise<string[]> {
  const table = page === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
  
  let query = supabase
    .from(table)
    .select('id');

  // Apply filters (reuse existing filter logic)
  if (filters?.searchTerm) {
    if (page === 'contacts') {
      query = query.or(`full_name.ilike.%${filters.searchTerm}%,email_address.ilike.%${filters.searchTerm}%,organization.ilike.%${filters.searchTerm}%`);
    } else {
      query = query.or(`deal_name.ilike.%${filters.searchTerm}%,sector.ilike.%${filters.searchTerm}%`);
    }
  }

  // Apply sorting
  if (sortLevels && sortLevels.length > 0) {
    sortLevels.forEach(level => {
      if (!level.custom) {
        query = query.order(level.id, { ascending: !level.desc });
      }
    });
  } else {
    // Default sort
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch IDs: ${error.message}`);
  }
  
  return (data || []).map(row => row.id);
}

/**
 * Fetch rows by IDs with batching
 */
export async function fetchRowsByIds({ 
  page, 
  ids, 
  columns 
}: { 
  page: 'contacts' | 'opportunities';
  ids: string[];
  columns: string[];
}): Promise<any[]> {
  if (ids.length === 0) return [];
  
  const table = page === 'contacts' ? 'contacts_raw' : 'opportunities_raw';
  const batches = chunk(ids, 1000);
  const allRows: any[] = [];
  
  for (const batch of batches) {
    const { data, error } = await supabase
      .from(table)
      .select(columns.length > 0 ? columns.join(',') : '*')
      .in('id', batch);
    
    if (error) {
      throw new Error(`Failed to fetch rows: ${error.message}`);
    }
    
    if (data) {
      allRows.push(...data);
    }
  }
  
  // Maintain original ID order
  const idOrder = new Map(ids.map((id, index) => [id, index]));
  return allRows.sort((a, b) => {
    const aIndex = idOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = idOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

/**
 * Get all raw column keys for a table
 */
export function getAllRawColumns(page: 'contacts' | 'opportunities'): string[] {
  if (page === 'contacts') {
    return [
      'id', 'created_at', 'updated_at', 'full_name', 'first_name', 'last_name',
      'email_address', 'organization', 'title', 'phone', 'category', 'notes',
      'areas_of_specialization', 'lg_sector', 'lg_focus_areas_comprehensive_list',
      'lg_focus_area_1', 'lg_focus_area_2', 'lg_focus_area_3', 'lg_focus_area_4',
      'lg_focus_area_5', 'lg_focus_area_6', 'lg_focus_area_7', 'lg_focus_area_8',
      'delta_type', 'delta', 'url_to_online_bio', 'contact_type',
      'most_recent_contact', 'latest_contact_email', 'latest_contact_meeting',
      'total_of_contacts', 'of_emails', 'of_meetings', 'days_since_last_email',
      'days_since_last_meeting', 'no_of_lg_focus_areas', 'no_of_opps_sourced',
      'all_opps', 'all_emails', 'outreach_date', 'email_subject', 'meeting_title',
      'email_from', 'email_to', 'email_cc', 'meeting_from', 'meeting_to', 'meeting_cc'
    ];
  } else {
    return [
      'id', 'created_at', 'updated_at', 'deal_name', 'sector', 'lg_focus_area',
      'platform_add_on', 'tier', 'status', 'summary_of_opportunity', 'next_steps',
      'ownership', 'ownership_type', 'ebitda', 'ebitda_in_ms', 'ebitda_notes',
      'investment_professional_point_person_1', 'investment_professional_point_person_2',
      'deal_source_company', 'deal_source_individual_1', 'deal_source_individual_2',
      'date_of_origination', 'url', 'most_recent_notes', 'dealcloud'
    ];
  }
}