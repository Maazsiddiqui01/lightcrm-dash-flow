import { supabase } from '@/integrations/supabase/client';
import { downloadFile } from '@/utils/csvExport';

export function buildCsvFromObjects(rows: any[], headers?: string[]): string {
  if (!rows.length) return '';
  
  // Get all columns, ensuring 'id' is first
  let cols: string[];
  if (headers && headers.length) {
    cols = headers;
  } else {
    const allKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    // Sort: id first, then alphabetically
    cols = allKeys.sort((a, b) => {
      if (a === 'id') return -1;
      if (b === 'id') return 1;
      return a.localeCompare(b);
    });
  }
  
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  
  const lines = [
    cols.join(','),
    ...rows.map(r => cols.map(c => esc(r?.[c] ?? '')).join(',')),
  ];
  
  return lines.join('\n');
}

function chunk<T>(arr: T[], n: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => 
    arr.slice(i * n, (i + 1) * n)
  );
}

export async function fetchOpportunitiesByIds(ids: string[]): Promise<any[]> {
  const rows: any[] = [];
  const chunks = chunk(ids, 500);
  
  for (const part of chunks) {
    const { data, error } = await supabase
      .from('opportunities_raw')
      .select('*')
      .in('id', part);
    
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  
  return rows;
}

export async function fetchFilteredOpportunityIds(filters: any): Promise<string[]> {
  let query = supabase
    .from('opportunities_raw')
    .select('id', { count: 'exact', head: false });

  // Apply the same filters as the table
  if (filters.focusArea?.length > 0) {
    query = query.in('lg_focus_area', filters.focusArea);
  }

  if (filters.sector?.length > 0) {
    query = query.in('sector', filters.sector);
  }

  if (filters.tier?.length > 0) {
    query = query.in('tier', filters.tier);
  }

  if (filters.status?.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.ownershipType?.length > 0) {
    query = query.in('ownership_type', filters.ownershipType);
  }

  if (filters.platformAddOn?.length > 0) {
    query = query.in('platform_add_on', filters.platformAddOn);
  }

  // Handle leads (union of two columns)
  if (filters.leads?.length > 0) {
    const leadsFilter = filters.leads.map((lead: string) => 
      `investment_professional_point_person_1.eq.${lead},investment_professional_point_person_2.eq.${lead}`
    ).join(',');
    query = query.or(leadsFilter);
  }

  // Handle referral contacts (union of two columns)
  if (filters.referralContacts?.length > 0) {
    const contactsFilter = filters.referralContacts.map((contact: string) => 
      `deal_source_individual_1.eq.${contact},deal_source_individual_2.eq.${contact}`
    ).join(',');
    query = query.or(contactsFilter);
  }

  // Handle referral companies
  if (filters.referralCompanies?.length > 0) {
    query = query.in('deal_source_company', filters.referralCompanies);
  }

  // Handle date of origination
  if (filters.dateOfOrigination?.length > 0) {
    const dateFilters = filters.dateOfOrigination.map((date: string) => 
      `date_of_origination.ilike.%${date}%`
    ).join(',');
    query = query.or(dateFilters);
  }

  // Handle EBITDA range (if provided)
  if (filters.ebitdaMin !== undefined || filters.ebitdaMax !== undefined) {
    // For now, we'll filter this client-side since it requires regex parsing
    // Could be optimized with a database function if needed
  }

  const { data, error } = await query.range(0, 999999);
  if (error) throw error;
  
  return (data ?? []).map(r => r.id);
}

export function generateExportFilename(prefix: string): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${prefix}-${year}-${month}-${day}.csv`;
}