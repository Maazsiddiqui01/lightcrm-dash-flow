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
  state?: string[];
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
      const lgQuery = filters.lgRelationship.map(rel => 
        `lg_relationship.ilike.%${rel}%`
      ).join(',');
      query = query.or(lgQuery);
    }

    if (filters.ebitdaMin !== null && filters.ebitdaMin !== undefined) {
      query = query.gte('ebitda_numeric', filters.ebitdaMin);
    }
    if (filters.ebitdaMax !== null && filters.ebitdaMax !== undefined) {
      query = query.lte('ebitda_numeric', filters.ebitdaMax);
    }

    if (filters.state && filters.state.length > 0) {
      query = query.in('company_hq_state', filters.state);
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
        .select("priority, process_status, ebitda_numeric");
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
      
      const averageEbitda = averageEbitdaNum > 0 
        ? `$${averageEbitdaNum.toFixed(1)}M`
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
