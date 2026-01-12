import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HorizonCombinedFilters } from '@/components/horizons/combined/HorizonCombinedFilterBar';
import { format } from 'date-fns';
import { parseFlexibleDate } from '@/utils/dateUtils';
import { fetchAllPaged } from '@/utils/supabaseFetchAll';

interface HorizonCombinedStats {
  totalUniverse: number;
  totalCompanies: number;
  totalGps: number;
  filteredPriorityCount: number;
  gpAumRange: string;
  acquisitionDateRange: string;
  loading: boolean;
}

export function useHorizonCombinedStats(filters?: HorizonCombinedFilters): HorizonCombinedStats {
  const [stats, setStats] = useState<HorizonCombinedStats>({
    totalUniverse: 0,
    totalCompanies: 0,
    totalGps: 0,
    filteredPriorityCount: 0,
    gpAumRange: 'N/A',
    acquisitionDateRange: 'N/A',
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true }));

        // Fetch Companies and GPs INDEPENDENTLY (UNION logic, not intersection)
        const [companies, gpData] = await Promise.all([
          fetchCompaniesForStats(filters),
          fetchGpsForStats(filters)
        ]);

        const totalCompanies = companies.length;
        const totalGps = gpData.length;
        const totalUniverse = totalCompanies + totalGps;
        
        // Count ALL priorities in filtered data (not just priority 1)
        const companyPriorityCount = companies.filter((c: any) => c.priority != null).length;
        const gpPriorityCount = gpData.filter((g: any) => g.priority != null).length;
        const filteredPriorityCount = companyPriorityCount + gpPriorityCount;

        // Calculate GP AUM Range from both companies (via linked GP) and GPs
        const allAumValues = [
          ...companies.filter((c: any) => c.gp_aum_numeric != null).map((c: any) => c.gp_aum_numeric),
          ...gpData.filter((g: any) => g.aum_numeric != null).map((g: any) => g.aum_numeric)
        ];
        
        let gpAumRange = 'N/A';
        if (allAumValues.length > 0) {
          const minAum = Math.min(...allAumValues) / 1_000_000_000;
          const maxAum = Math.max(...allAumValues) / 1_000_000_000;
          gpAumRange = minAum === maxAum 
            ? `$${minAum.toFixed(1)}B`
            : `$${minAum.toFixed(1)}B - $${maxAum.toFixed(1)}B`;
        }

        // Calculate Acquisition Date Range (from companies only)
        const acquisitionDates = companies
          .filter((c: any) => c.date_of_acquisition)
          .map((c: any) => parseFlexibleDate(c.date_of_acquisition))
          .filter((d: Date | null) => d !== null) as Date[];

        let acquisitionDateRange = 'N/A';
        if (acquisitionDates.length > 0) {
          const sortedDates = acquisitionDates.sort((a, b) => a.getTime() - b.getTime());
          const minDate = sortedDates[0];
          const maxDate = sortedDates[sortedDates.length - 1];
          acquisitionDateRange = minDate.getTime() === maxDate.getTime()
            ? format(minDate, 'MMM yyyy')
            : `${format(minDate, 'MMM yyyy')} - ${format(maxDate, 'MMM yyyy')}`;
        }

        setStats({
          totalUniverse,
          totalCompanies,
          totalGps,
          filteredPriorityCount,
          gpAumRange,
          acquisitionDateRange,
          loading: false,
        });
      } catch (error) {
        console.error('Error in fetchStats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, [JSON.stringify(filters)]);

  return stats;
}

// Fetch Companies - applies ONLY company-specific + common filters (NO GP filters)
async function fetchCompaniesForStats(filters?: HorizonCombinedFilters): Promise<any[]> {
  const makeCompanyQuery = (from: number, to: number) => {
    let query = supabase
      .from('lg_horizons_companies')
      .select(`
        id, priority, gp_aum_numeric, date_of_acquisition,
        company_hq_city, company_hq_state
      `)
      .range(from, to)
      .order('id', { ascending: true });

    // Common filters
    if (filters?.priority && filters.priority.length > 0) {
      const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (vals.length > 0) query = query.in('priority', vals);
    }

    if (filters?.lgRelationship && filters.lgRelationship.length > 0) {
      const hasNoKnownRelationship = filters.lgRelationship.includes('NO_KNOWN_RELATIONSHIP');
      const regularValues = filters.lgRelationship.filter(v => v !== 'NO_KNOWN_RELATIONSHIP');
      
      if (hasNoKnownRelationship && regularValues.length > 0) {
        query = query.or(`lg_relationship.is.null,lg_relationship.eq.,lg_relationship.in.(${regularValues.join(',')})`);
      } else if (hasNoKnownRelationship) {
        query = query.or('lg_relationship.is.null,lg_relationship.eq.');
      } else if (regularValues.length > 0) {
        query = query.in('lg_relationship', regularValues);
      }
    }

    // Company-specific filters ONLY (NO GP filters here)
    if (filters?.sector && filters.sector.length > 0) {
      query = query.in('sector', filters.sector);
    }
    if (filters?.subsector && filters.subsector.length > 0) {
      query = query.in('subsector', filters.subsector);
    }
    if (filters?.processStatus && filters.processStatus.length > 0) {
      query = query.in('process_status', filters.processStatus);
    }
    if (filters?.ownership && filters.ownership.length > 0) {
      query = query.in('ownership', filters.ownership);
    }
    if (filters?.companyState && filters.companyState.length > 0) {
      query = query.in('company_hq_state', filters.companyState);
    }
    if (filters?.companyCity && filters.companyCity.length > 0) {
      query = query.in('company_hq_city', filters.companyCity);
    }
    if (filters?.source && filters.source.length > 0) {
      query = query.in('source', filters.source);
    }
    if (filters?.parentGp && filters.parentGp.length > 0) {
      query = query.in('parent_gp_name', filters.parentGp);
    }
    if (filters?.ebitdaMin != null) {
      query = query.gte('ebitda_numeric', filters.ebitdaMin);
    }
    if (filters?.ebitdaMax != null) {
      query = query.lte('ebitda_numeric', filters.ebitdaMax);
    }
    if (filters?.revenueMin != null) {
      query = query.gte('revenue_numeric', filters.revenueMin);
    }
    if (filters?.revenueMax != null) {
      query = query.lte('revenue_numeric', filters.revenueMax);
    }

    return query;
  };

  let companies = await fetchAllPaged<any>(makeCompanyQuery);

  // Combined location filters - match company location
  if (filters?.combinedCity && filters.combinedCity.length > 0) {
    companies = companies.filter((c: any) => 
      filters.combinedCity.includes(c.company_hq_city || '')
    );
  }
  if (filters?.combinedState && filters.combinedState.length > 0) {
    companies = companies.filter((c: any) => 
      filters.combinedState.includes(c.company_hq_state || '')
    );
  }

  // Date of acquisition filter - client-side because it's stored as text
  if (filters?.dateOfAcquisitionStart) {
    const startDate = parseFlexibleDate(filters.dateOfAcquisitionStart);
    if (startDate) {
      companies = companies.filter((c: any) => {
        if (!c.date_of_acquisition) return false;
        const acqDate = parseFlexibleDate(c.date_of_acquisition);
        return acqDate && acqDate >= startDate;
      });
    }
  }
  if (filters?.dateOfAcquisitionEnd) {
    const endDate = parseFlexibleDate(filters.dateOfAcquisitionEnd);
    if (endDate) {
      companies = companies.filter((c: any) => {
        if (!c.date_of_acquisition) return false;
        const acqDate = parseFlexibleDate(c.date_of_acquisition);
        return acqDate && acqDate <= endDate;
      });
    }
  }

  return companies;
}

// Fetch GPs - applies ONLY GP-specific + common filters (NO company filters)
async function fetchGpsForStats(filters?: HorizonCombinedFilters): Promise<any[]> {
  const makeGpQuery = (from: number, to: number) => {
    let query = supabase
      .from('lg_horizons_gps')
      .select('id, priority, aum_numeric, fund_hq_city, fund_hq_state')
      .range(from, to)
      .order('id', { ascending: true });

    // Common filters
    if (filters?.priority && filters.priority.length > 0) {
      const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (vals.length > 0) query = query.in('priority', vals);
    }
    if (filters?.lgRelationship && filters.lgRelationship.length > 0) {
      const hasNoKnownRelationship = filters.lgRelationship.includes('NO_KNOWN_RELATIONSHIP');
      const regularValues = filters.lgRelationship.filter(v => v !== 'NO_KNOWN_RELATIONSHIP');
      if (hasNoKnownRelationship && regularValues.length > 0) {
        query = query.or(`lg_relationship.is.null,lg_relationship.eq.,lg_relationship.in.(${regularValues.join(',')})`);
      } else if (hasNoKnownRelationship) {
        query = query.or('lg_relationship.is.null,lg_relationship.eq.');
      } else if (regularValues.length > 0) {
        query = query.in('lg_relationship', regularValues);
      }
    }

    // GP-specific filters ONLY (NO company filters here)
    if (filters?.industrySector && filters.industrySector.length > 0) {
      const conditions = filters.industrySector.map(sector => `industry_sector_focus.ilike.%${sector}%`).join(',');
      query = query.or(conditions);
    }
    if (filters?.gpState && filters.gpState.length > 0) {
      query = query.in('fund_hq_state', filters.gpState);
    }
    if (filters?.gpCity && filters.gpCity.length > 0) {
      query = query.in('fund_hq_city', filters.gpCity);
    }
    if (filters?.aumMin != null) {
      query = query.gte('aum_numeric', filters.aumMin);
    }
    if (filters?.aumMax != null) {
      query = query.lte('aum_numeric', filters.aumMax);
    }

    return query;
  };

  let gps = await fetchAllPaged<any>(makeGpQuery);

  // Combined location filters - match GP location
  if (filters?.combinedCity && filters.combinedCity.length > 0) {
    gps = gps.filter((g: any) => filters.combinedCity.includes(g.fund_hq_city || ''));
  }
  if (filters?.combinedState && filters.combinedState.length > 0) {
    gps = gps.filter((g: any) => filters.combinedState.includes(g.fund_hq_state || ''));
  }

  return gps;
}
