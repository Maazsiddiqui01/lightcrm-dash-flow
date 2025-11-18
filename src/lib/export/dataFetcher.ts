import { supabase } from '@/integrations/supabase/client';
import { chunk } from './csvUtils';
import { READ_ONLY_OPPORTUNITY_COLUMNS } from '@/utils/opportunityColumnMapping';
import { CONTACT_DB_COLUMNS, READ_ONLY_CONTACT_COLUMNS } from '@/utils/contactsColumnMapping';

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
  
  // Type as any to avoid excessive depth errors with complex query chains
  let query: any = supabase
    .from(table)
    .select('id');

  // Apply filters based on page type
  if (page === 'opportunities') {
    // Apply all opportunity filters
    if (filters?.focusArea?.length > 0) {
      query = query.in('lg_focus_area', filters.focusArea);
    }
    if (filters?.sector?.length > 0) {
      query = query.in('sector', filters.sector);
    }
    if (filters?.tier?.length > 0) {
      query = query.in('tier', filters.tier);
    }
    if (filters?.status?.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.ownershipType?.length > 0) {
      query = query.in('ownership_type', filters.ownershipType);
    }
    if (filters?.platformAddOn?.length > 0) {
      query = query.in('platform_add_on', filters.platformAddOn);
    }
    if (filters?.headquarters?.length > 0) {
      query = query.in('headquarters', filters.headquarters);
    }
    if (filters?.funds?.length > 0) {
      query = query.in('funds', filters.funds);
    }
    if (filters?.leads?.length > 0) {
      const lgLeadQuery = filters.leads.map((lead: string) => 
        `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
      ).join(',');
      query = query.or(lgLeadQuery);
    }
    if (filters?.referralContacts?.length > 0) {
      const contactQuery = filters.referralContacts.map((contact: string) => 
        `deal_source_individual_1.ilike.%${contact}%,deal_source_individual_2.ilike.%${contact}%`
      ).join(',');
      query = query.or(contactQuery);
    }
    if (filters?.referralCompanies?.length > 0) {
      query = query.in('deal_source_company', filters.referralCompanies);
    }
    if (filters?.ebitdaMin !== null && filters?.ebitdaMin !== undefined) {
      query = query.gte('ebitda_in_ms', filters.ebitdaMin);
    }
    if (filters?.ebitdaMax !== null && filters?.ebitdaMax !== undefined) {
      query = query.lte('ebitda_in_ms', filters.ebitdaMax);
    }
    if (filters?.dateOfOrigination?.length > 0) {
      const dateConditions = filters.dateOfOrigination.map((dateValue: string) => {
        if (dateValue.includes(' to ')) {
          const [start, end] = dateValue.split(' to ');
          return `date_of_origination.gte.${start},date_of_origination.lte.${end}`;
        }
        return `date_of_origination.eq.${dateValue}`;
      });
      query = query.or(dateConditions.join(','));
    }
    if (filters?.processTimeline?.length > 0) {
      query = query.in('process_timeline', filters.processTimeline);
    }
    if (filters?.acquisitionDateStart) {
      query = query.gte('acquisition_date', filters.acquisitionDateStart.toISOString().split('T')[0]);
    }
    if (filters?.acquisitionDateEnd) {
      query = query.lte('acquisition_date', filters.acquisitionDateEnd.toISOString().split('T')[0]);
    }
    
    // Search term for opportunities
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      query = query.or(
        `deal_name.ilike.%${searchLower}%,` +
        `summary_of_opportunity.ilike.%${searchLower}%,` +
        `deal_source_company.ilike.%${searchLower}%,` +
        `deal_source_individual_1.ilike.%${searchLower}%,` +
        `deal_source_individual_2.ilike.%${searchLower}%,` +
        `sector.ilike.%${searchLower}%,` +
        `most_recent_notes.ilike.%${searchLower}%,` +
        `next_steps.ilike.%${searchLower}%,` +
        `lg_focus_area.ilike.%${searchLower}%`
      );
    }
  } else if (page === 'contacts') {
    // Apply contact filters
    if (filters?.searchTerm) {
      const search = filters.searchTerm.trim().toLowerCase();
      query = query.or(
        `full_name.ilike.%${search}%,` +
        `email_address.ilike.%${search}%,` +
        `organization.ilike.%${search}%,` +
        `title.ilike.%${search}%,` +
        `notes.ilike.%${search}%,` +
        `lg_focus_areas_comprehensive_list.ilike.%${search}%`
      );
    }
    
    // Sectors
    if (filters?.sectors?.length > 0) {
      query = query.in('lg_sector', filters.sectors);
    }
    
    // Organizations
    if (filters?.organizations?.length > 0) {
      query = query.in('organization', filters.organizations);
    }
    
    // Titles
    if (filters?.titles?.length > 0) {
      query = query.in('title', filters.titles);
    }
    
    // Categories
    if (filters?.categories?.length > 0) {
      query = query.in('category', filters.categories);
    }
    
    // Delta Type
    if (filters?.deltaType?.length > 0) {
      query = query.in('delta_type', filters.deltaType);
    }
    
    // Has Opportunities
    if (filters?.hasOpportunities?.length > 0) {
      if (filters.hasOpportunities.includes('Yes') && !filters.hasOpportunities.includes('No')) {
        query = query.gt('all_opps', 0);
      } else if (filters.hasOpportunities.includes('No') && !filters.hasOpportunities.includes('Yes')) {
        query = query.or('all_opps.is.null,all_opps.eq.0');
      }
    }
    
    // Date range for most recent contact
    if (filters?.mostRecentContactStart) {
      query = query.gte('most_recent_contact', filters.mostRecentContactStart);
    }
    if (filters?.mostRecentContactEnd) {
      query = query.lte('most_recent_contact', filters.mostRecentContactEnd);
    }
    
    // Delta range
    if (filters?.deltaMin !== null && filters?.deltaMin !== undefined) {
      query = query.gte('delta', filters.deltaMin);
    }
    if (filters?.deltaMax !== null && filters?.deltaMax !== undefined) {
      query = query.lte('delta', filters.deltaMax);
    }
    
    // LG Lead
    if (filters?.lgLead?.length > 0) {
      const leadConditions = filters.lgLead.map((lead: string) => 
        `lg_lead.ilike.%${lead}%`
      ).join(',');
      query = query.or(leadConditions);
    }
    
    // Group Contacts
    if (filters?.groupContacts?.length > 0) {
      query = query.in('group_contact', filters.groupContacts);
    }
    
    // Areas of specialization
    if (filters?.areasOfSpecialization?.length > 0) {
      const areasQuery = filters.areasOfSpecialization.map((area: string) => 
        `areas_of_specialization.ilike.%${area}%`
      ).join(',');
      query = query.or(areasQuery);
    }
  }

  // Apply sorting
  if (sortLevels && sortLevels.length > 0) {
    sortLevels.forEach((level: any) => {
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
  
  return (data || []).map((row: any) => row.id);
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
    // Return all database columns except read-only ones (keep 'id' for matching)
    return CONTACT_DB_COLUMNS.filter((col: string) => 
      col === 'id' || !READ_ONLY_CONTACT_COLUMNS.includes(col as any)
    );
  } else {
    // Opportunities - all columns except read-only ones
    const allColumns = [
      'id', 'created_at', 'updated_at', 'deal_name', 'sector', 'lg_focus_area',
      'platform_add_on', 'tier', 'status', 'summary_of_opportunity', 'next_steps',
      'next_steps_due_date', 'ownership', 'ownership_type', 'ebitda', 'ebitda_in_ms', 
      'ebitda_notes', 'revenue', 'est_deal_size', 'est_lg_equity_invest', 'headquarters',
      'investment_professional_point_person_1', 'investment_professional_point_person_2',
      'investment_professional_point_person_3', 'investment_professional_point_person_4',
      'lg_team', 'deal_source_company', 'deal_source_individual_1', 'deal_source_individual_2',
      'deal_source_contact_1_id', 'deal_source_contact_2_id', 'date_of_origination', 
      'acquisition_date', 'process_timeline', 'url', 'most_recent_notes', 'dealcloud',
      'assigned_to', 'funds', 'deal_source_contacts', 'last_modified'
    ];
    
    // Filter out read-only columns (except 'id' which is needed for matching)
    return allColumns.filter(col => 
      col === 'id' || !READ_ONLY_OPPORTUNITY_COLUMNS.includes(col as any)
    );
  }
}
