import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HorizonCompanyStats {
  totalCompanies: number;
  priority1Count: number;
  expectedMonitoringCount: number;
  averageEbitda: string;
  loading: boolean;
}

interface HorizonCompanyFilters {
  sector?: string[];
  subsector?: string[];
  processStatus?: string[];
  ownership?: string[];
  priority?: string[];
  lgRelationship?: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  revenueMin?: number;
  revenueMax?: number;
  gpAumMin?: number;
  gpAumMax?: number;
  state?: string[];
  city?: string[];
  source?: string[];
  parentGp?: string[];
}

export function useHorizonCompanyStats(filters?: HorizonCompanyFilters): HorizonCompanyStats {
  const [stats, setStats] = useState<HorizonCompanyStats>({
    totalCompanies: 0,
    priority1Count: 0,
    expectedMonitoringCount: 0,
    averageEbitda: "$0M",
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, [JSON.stringify(filters)]);

  const applyFilters = (query: any) => {
    if (!filters) return query;

    if (filters.sector && filters.sector.length > 0) {
      query = query.in('sector', filters.sector);
    }

    if (filters.subsector && filters.subsector.length > 0) {
      query = query.in('subsector', filters.subsector);
    }

    if (filters.processStatus && filters.processStatus.length > 0) {
      query = query.in('process_status', filters.processStatus);
    }

    if (filters.ownership && filters.ownership.length > 0) {
      query = query.in('ownership', filters.ownership);
    }

    if (filters.priority && filters.priority.length > 0) {
      const priorityValues = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (priorityValues.length > 0) {
        query = query.in('priority', priorityValues);
      }
    }

    if (filters.lgRelationship && filters.lgRelationship.length > 0) {
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

    if (filters.ebitdaMin !== null && filters.ebitdaMin !== undefined) {
      query = query.gte('ebitda_numeric', filters.ebitdaMin * 1_000_000);
    }
    if (filters.ebitdaMax !== null && filters.ebitdaMax !== undefined) {
      query = query.lte('ebitda_numeric', filters.ebitdaMax * 1_000_000);
    }

    if (filters.revenueMin !== null && filters.revenueMin !== undefined) {
      query = query.gte('revenue_numeric', filters.revenueMin * 1_000_000);
    }
    if (filters.revenueMax !== null && filters.revenueMax !== undefined) {
      query = query.lte('revenue_numeric', filters.revenueMax * 1_000_000);
    }

    if (filters.gpAumMin !== null && filters.gpAumMin !== undefined) {
      query = query.gte('gp_aum_numeric', filters.gpAumMin * 1_000_000_000);
    }
    if (filters.gpAumMax !== null && filters.gpAumMax !== undefined) {
      query = query.lte('gp_aum_numeric', filters.gpAumMax * 1_000_000_000);
    }

    if (filters.state && filters.state.length > 0) {
      query = query.in('company_hq_state', filters.state);
    }

    if (filters.city && filters.city.length > 0) {
      query = query.in('company_hq_city', filters.city);
    }

    if (filters.source && filters.source.length > 0) {
      query = query.in('source', filters.source);
    }

    if (filters.parentGp && filters.parentGp.length > 0) {
      query = query.in('parent_gp_name', filters.parentGp);
    }

    return query;
  };

  const fetchStats = async () => {
    try {
      let query = supabase
        .from("lg_horizons_companies")
        .select("priority, process_status, ebitda_numeric")
        .limit(10000);
      query = applyFilters(query);
      const { data: companies, error } = await query;

      if (error) throw error;

      const totalCompanies = companies?.length || 0;
      
      const priority1Count = companies?.filter(c => c.priority === 1).length || 0;

      const expectedMonitoringCount = companies?.filter(c => 
        c.process_status?.toLowerCase().includes('expected') || 
        c.process_status?.toLowerCase().includes('monitoring')
      ).length || 0;

      const companiesWithEbitda = companies?.filter(c => c.ebitda_numeric != null) || [];
      const totalEbitda = companiesWithEbitda.reduce((sum, c) => sum + (c.ebitda_numeric || 0), 0);
      const averageEbitdaNum = companiesWithEbitda.length > 0 
        ? totalEbitda / companiesWithEbitda.length 
        : 0;
      
      // Convert from raw value to millions for display
      const averageEbitdaInMillions = averageEbitdaNum / 1_000_000;
      const averageEbitda = averageEbitdaInMillions > 0 
        ? `$${averageEbitdaInMillions.toFixed(1)}M`
        : "$0M";

      setStats({
        totalCompanies,
        priority1Count,
        expectedMonitoringCount,
        averageEbitda,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching horizon company stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}
