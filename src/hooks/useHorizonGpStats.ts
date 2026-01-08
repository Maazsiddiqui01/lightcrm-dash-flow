import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HorizonGpStats {
  totalGps: number;
  priority1Count: number;
  totalAum: string;
  avgActiveHoldings: string;
  loading: boolean;
}

interface HorizonGpFilters {
  lgRelationship?: string[];
  aumMin?: number;
  aumMax?: number;
  state?: string[];
  industrySector?: string[];
  priority?: string[];
}

export function useHorizonGpStats(filters?: HorizonGpFilters): HorizonGpStats {
  const [stats, setStats] = useState<HorizonGpStats>({
    totalGps: 0,
    priority1Count: 0,
    totalAum: "$0B",
    avgActiveHoldings: "0",
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, [JSON.stringify(filters)]);

  const applyFilters = (query: any) => {
    if (!filters) return query;

    if (filters.lgRelationship && filters.lgRelationship.length > 0) {
      const lgQuery = filters.lgRelationship.map(rel => 
        `lg_relationship.ilike.%${rel}%`
      ).join(',');
      query = query.or(lgQuery);
    }

    if (filters.aumMin !== null && filters.aumMin !== undefined) {
      query = query.gte('aum_numeric', filters.aumMin);
    }
    if (filters.aumMax !== null && filters.aumMax !== undefined) {
      query = query.lte('aum_numeric', filters.aumMax);
    }

    if (filters.state && filters.state.length > 0) {
      query = query.in('fund_hq_state', filters.state);
    }

    if (filters.industrySector && filters.industrySector.length > 0) {
      const sectorQuery = filters.industrySector.map(sec => 
        `industry_sector_focus.ilike.%${sec}%`
      ).join(',');
      query = query.or(sectorQuery);
    }

    if (filters.priority && filters.priority.length > 0) {
      const priorityValues = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (priorityValues.length > 0) {
        query = query.in('priority', priorityValues);
      }
    }

    return query;
  };

  const fetchStats = async () => {
    try {
      let query = supabase
        .from("lg_horizons_gps")
        .select("priority, aum_numeric, active_holdings");
      query = applyFilters(query);
      const { data: gps, error } = await query;

      if (error) throw error;

      const totalGps = gps?.length || 0;
      
      const priority1Count = gps?.filter(g => g.priority === 1).length || 0;

      // Total AUM in billions
      const totalAumNum = gps?.reduce((sum, g) => sum + (g.aum_numeric || 0), 0) || 0;
      const totalAumInBillions = totalAumNum / 1_000_000_000;
      const totalAum = totalAumInBillions > 0 
        ? `$${totalAumInBillions.toFixed(1)}B`
        : "$0B";

      // Average active holdings
      const gpsWithHoldings = gps?.filter(g => g.active_holdings != null) || [];
      const totalHoldings = gpsWithHoldings.reduce((sum, g) => sum + (g.active_holdings || 0), 0);
      const avgHoldings = gpsWithHoldings.length > 0 
        ? totalHoldings / gpsWithHoldings.length 
        : 0;
      const avgActiveHoldings = avgHoldings.toFixed(1);

      setStats({
        totalGps,
        priority1Count,
        totalAum,
        avgActiveHoldings,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching horizon GP stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}
