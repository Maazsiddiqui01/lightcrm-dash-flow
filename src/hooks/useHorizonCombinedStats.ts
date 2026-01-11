import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HorizonCombinedFilters } from '@/components/horizons/combined/HorizonCombinedFilterBar';
import { format } from 'date-fns';
import { parseFlexibleDate } from '@/utils/dateUtils';

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

        // Fetch companies with GP data for client-side GP filtering
        let companyQuery = supabase
          .from('lg_horizons_companies')
          .select(`
            id, priority, ebitda_numeric, parent_gp_id, gp_aum_numeric, date_of_acquisition,
            gp_data:lg_horizons_gps!parent_gp_id (
              id,
              aum_numeric,
              fund_hq_city,
              fund_hq_state,
              industry_sector_focus
            )
          `)
          .limit(10000);

        // Apply common filters
        if (filters?.priority && filters.priority.length > 0) {
          const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
          if (vals.length > 0) companyQuery = companyQuery.in('priority', vals);
        }

        if (filters?.lgRelationship && filters.lgRelationship.length > 0) {
          const hasNoKnownRelationship = filters.lgRelationship.includes('NO_KNOWN_RELATIONSHIP');
          const regularValues = filters.lgRelationship.filter(v => v !== 'NO_KNOWN_RELATIONSHIP');
          
          if (hasNoKnownRelationship && regularValues.length > 0) {
            companyQuery = companyQuery.or(`lg_relationship.is.null,lg_relationship.eq.,lg_relationship.in.(${regularValues.join(',')})`);
          } else if (hasNoKnownRelationship) {
            companyQuery = companyQuery.or('lg_relationship.is.null,lg_relationship.eq.');
          } else if (regularValues.length > 0) {
            companyQuery = companyQuery.in('lg_relationship', regularValues);
          }
        }

        // Company-specific filters
        if (filters?.sector && filters.sector.length > 0) {
          companyQuery = companyQuery.in('sector', filters.sector);
        }
        if (filters?.subsector && filters.subsector.length > 0) {
          companyQuery = companyQuery.in('subsector', filters.subsector);
        }
        if (filters?.processStatus && filters.processStatus.length > 0) {
          companyQuery = companyQuery.in('process_status', filters.processStatus);
        }
        if (filters?.ownership && filters.ownership.length > 0) {
          companyQuery = companyQuery.in('ownership', filters.ownership);
        }
        if (filters?.companyState && filters.companyState.length > 0) {
          companyQuery = companyQuery.in('company_hq_state', filters.companyState);
        }
        if (filters?.companyCity && filters.companyCity.length > 0) {
          companyQuery = companyQuery.in('company_hq_city', filters.companyCity);
        }
        if (filters?.source && filters.source.length > 0) {
          companyQuery = companyQuery.in('source', filters.source);
        }
        if (filters?.parentGp && filters.parentGp.length > 0) {
          companyQuery = companyQuery.in('parent_gp_name', filters.parentGp);
        }

        // Numeric filters - values are now raw numbers, no conversion needed
        if (filters?.ebitdaMin != null) {
          companyQuery = companyQuery.gte('ebitda_numeric', filters.ebitdaMin);
        }
        if (filters?.ebitdaMax != null) {
          companyQuery = companyQuery.lte('ebitda_numeric', filters.ebitdaMax);
        }
        if (filters?.revenueMin != null) {
          companyQuery = companyQuery.gte('revenue_numeric', filters.revenueMin);
        }
        if (filters?.revenueMax != null) {
          companyQuery = companyQuery.lte('revenue_numeric', filters.revenueMax);
        }
        if (filters?.gpAumMin != null) {
          companyQuery = companyQuery.gte('gp_aum_numeric', filters.gpAumMin);
        }
        if (filters?.gpAumMax != null) {
          companyQuery = companyQuery.lte('gp_aum_numeric', filters.gpAumMax);
        }

        const { data: companyData, error: companyError } = await companyQuery;

        if (companyError) {
          console.error('Error fetching combined stats:', companyError);
          return;
        }

        // Transform gp_data from array to single object
        let companies = (companyData || []).map((row: any) => ({
          ...row,
          gp_data: Array.isArray(row.gp_data) ? row.gp_data[0] || null : row.gp_data,
        }));

        // Apply GP-specific filters client-side
        if (filters?.industrySector && filters.industrySector.length > 0) {
          companies = companies.filter((c: any) => 
            c.gp_data && filters.industrySector.some(sector => 
              c.gp_data?.industry_sector_focus?.toLowerCase().includes(sector.toLowerCase())
            )
          );
        }
        if (filters?.gpState && filters.gpState.length > 0) {
          companies = companies.filter((c: any) => 
            c.gp_data && filters.gpState.includes(c.gp_data.fund_hq_state || '')
          );
        }
        if (filters?.gpCity && filters.gpCity.length > 0) {
          companies = companies.filter((c: any) => 
            c.gp_data && filters.gpCity.includes(c.gp_data.fund_hq_city || '')
          );
        }
        // GP AUM filters - values are now raw numbers
        if (filters?.aumMin != null) {
          companies = companies.filter((c: any) => 
            c.gp_data && (c.gp_data.aum_numeric || 0) >= filters.aumMin!
          );
        }
        if (filters?.aumMax != null) {
          companies = companies.filter((c: any) => 
            c.gp_data && (c.gp_data.aum_numeric || 0) <= filters.aumMax!
          );
        }

        // Fetch GP count separately
        let gpQuery = supabase
          .from('lg_horizons_gps')
          .select('id, priority, aum_numeric')
          .limit(10000);

        // Apply GP filters
        if (filters?.priority && filters.priority.length > 0) {
          const vals = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
          if (vals.length > 0) gpQuery = gpQuery.in('priority', vals);
        }
        if (filters?.lgRelationship && filters.lgRelationship.length > 0) {
          const hasNoKnownRelationship = filters.lgRelationship.includes('NO_KNOWN_RELATIONSHIP');
          const regularValues = filters.lgRelationship.filter(v => v !== 'NO_KNOWN_RELATIONSHIP');
          if (hasNoKnownRelationship && regularValues.length > 0) {
            gpQuery = gpQuery.or(`lg_relationship.is.null,lg_relationship.eq.,lg_relationship.in.(${regularValues.join(',')})`);
          } else if (hasNoKnownRelationship) {
            gpQuery = gpQuery.or('lg_relationship.is.null,lg_relationship.eq.');
          } else if (regularValues.length > 0) {
            gpQuery = gpQuery.in('lg_relationship', regularValues);
          }
        }
        if (filters?.industrySector && filters.industrySector.length > 0) {
          const conditions = filters.industrySector.map(sector => `industry_sector_focus.ilike.%${sector}%`).join(',');
          gpQuery = gpQuery.or(conditions);
        }
        if (filters?.gpState && filters.gpState.length > 0) {
          gpQuery = gpQuery.in('fund_hq_state', filters.gpState);
        }
        if (filters?.gpCity && filters.gpCity.length > 0) {
          gpQuery = gpQuery.in('fund_hq_city', filters.gpCity);
        }
        // GP AUM filters - values are now raw numbers
        if (filters?.aumMin != null) {
          gpQuery = gpQuery.gte('aum_numeric', filters.aumMin);
        }
        if (filters?.aumMax != null) {
          gpQuery = gpQuery.lte('aum_numeric', filters.aumMax);
        }

        const { data: gpData, error: gpError } = await gpQuery;
        if (gpError) {
          console.error('Error fetching GP stats:', gpError);
        }

        const totalCompanies = companies.length;
        const totalGps = gpData?.length || 0;
        const totalUniverse = totalCompanies + totalGps;
        
        // Count ALL priorities in filtered data (not just priority 1)
        const companyPriorityCount = companies.filter((c: any) => c.priority != null).length;
        const gpPriorityCount = gpData?.filter((g: any) => g.priority != null).length || 0;
        const filteredPriorityCount = companyPriorityCount + gpPriorityCount;

        // Calculate GP AUM Range
        const allAumValues = [
          ...companies.filter((c: any) => c.gp_aum_numeric != null).map((c: any) => c.gp_aum_numeric),
          ...(gpData?.filter((g: any) => g.aum_numeric != null).map((g: any) => g.aum_numeric) || [])
        ];
        
        let gpAumRange = 'N/A';
        if (allAumValues.length > 0) {
          const minAum = Math.min(...allAumValues) / 1_000_000_000;
          const maxAum = Math.max(...allAumValues) / 1_000_000_000;
          gpAumRange = minAum === maxAum 
            ? `$${minAum.toFixed(1)}B`
            : `$${minAum.toFixed(1)}B - $${maxAum.toFixed(1)}B`;
        }

        // Calculate Acquisition Date Range
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
