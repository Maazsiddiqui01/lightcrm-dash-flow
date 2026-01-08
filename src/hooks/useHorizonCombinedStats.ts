import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HorizonCombinedFilters } from '@/components/horizons/combined/HorizonCombinedFilterBar';

interface HorizonCombinedStats {
  totalCompanies: number;
  linkedGps: number;
  priority1Count: number;
  averageEbitda: string;
  averageGpAum: string;
  loading: boolean;
}

export function useHorizonCombinedStats(filters?: HorizonCombinedFilters): HorizonCombinedStats {
  const [stats, setStats] = useState<HorizonCombinedStats>({
    totalCompanies: 0,
    linkedGps: 0,
    priority1Count: 0,
    averageEbitda: '$0M',
    averageGpAum: '$0B',
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true }));

        // Build query with filters
        let query = supabase
          .from('lg_horizons_companies')
          .select('id, priority, ebitda_numeric, parent_gp_id, gp_aum_numeric')
          .limit(10000);

        // Apply common filters
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

        // Company-specific filters
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

        // Numeric filters
        if (filters?.ebitdaMin != null) {
          query = query.gte('ebitda_numeric', filters.ebitdaMin * 1_000_000);
        }
        if (filters?.ebitdaMax != null) {
          query = query.lte('ebitda_numeric', filters.ebitdaMax * 1_000_000);
        }
        if (filters?.revenueMin != null) {
          query = query.gte('revenue_numeric', filters.revenueMin * 1_000_000);
        }
        if (filters?.revenueMax != null) {
          query = query.lte('revenue_numeric', filters.revenueMax * 1_000_000);
        }
        if (filters?.gpAumMin != null) {
          query = query.gte('gp_aum_numeric', filters.gpAumMin * 1_000_000_000);
        }
        if (filters?.gpAumMax != null) {
          query = query.lte('gp_aum_numeric', filters.gpAumMax * 1_000_000_000);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching combined stats:', error);
          return;
        }

        const companies = data || [];
        const totalCompanies = companies.length;
        const linkedGpIds = new Set(companies.filter(c => c.parent_gp_id).map(c => c.parent_gp_id));
        const linkedGps = linkedGpIds.size;
        const priority1Count = companies.filter(c => c.priority === 1).length;

        // Calculate average EBITDA
        const ebitdaValues = companies.filter(c => c.ebitda_numeric != null).map(c => c.ebitda_numeric!);
        const avgEbitda = ebitdaValues.length > 0
          ? ebitdaValues.reduce((sum, val) => sum + val, 0) / ebitdaValues.length / 1_000_000
          : 0;
        const avgEbitdaFormatted = avgEbitda >= 1000
          ? `$${(avgEbitda / 1000).toFixed(1)}B`
          : `$${avgEbitda.toFixed(0)}M`;

        // Calculate average GP AUM
        const aumValues = companies.filter(c => c.gp_aum_numeric != null).map(c => c.gp_aum_numeric!);
        const avgAum = aumValues.length > 0
          ? aumValues.reduce((sum, val) => sum + val, 0) / aumValues.length / 1_000_000_000
          : 0;
        const avgAumFormatted = `$${avgAum.toFixed(1)}B`;

        setStats({
          totalCompanies,
          linkedGps,
          priority1Count,
          averageEbitda: avgEbitdaFormatted,
          averageGpAum: avgAumFormatted,
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
