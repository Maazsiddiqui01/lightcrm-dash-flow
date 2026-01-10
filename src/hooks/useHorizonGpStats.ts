import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HorizonGpStats {
  totalGps: number;
  filteredPriorityCount: number;
  totalAum: string;
  aumRange: string;
  loading: boolean;
}

interface HorizonGpFilters {
  lgRelationship?: string[];
  aumMin?: number;
  aumMax?: number;
  state?: string[];
  city?: string[];
  industrySector?: string[];
  priority?: string[];
}

export function useHorizonGpStats(filters?: HorizonGpFilters): HorizonGpStats {
  const [stats, setStats] = useState<HorizonGpStats>({
    totalGps: 0,
    filteredPriorityCount: 0,
    totalAum: "$0B",
    aumRange: "N/A",
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, [JSON.stringify(filters)]);

  const applyFilters = (query: any) => {
    if (!filters) return query;

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

    if (filters.aumMin !== null && filters.aumMin !== undefined) {
      query = query.gte('aum_numeric', filters.aumMin * 1_000_000_000);
    }
    if (filters.aumMax !== null && filters.aumMax !== undefined) {
      query = query.lte('aum_numeric', filters.aumMax * 1_000_000_000);
    }

    if (filters.state && filters.state.length > 0) {
      query = query.in('fund_hq_state', filters.state);
    }

    if (filters.city && filters.city.length > 0) {
      query = query.in('fund_hq_city', filters.city);
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
        .select("priority, aum_numeric")
        .limit(10000);
      query = applyFilters(query);
      const { data: gps, error } = await query;

      if (error) throw error;

      const totalGps = gps?.length || 0;
      
      // Count all records that have a priority set
      const filteredPriorityCount = gps?.filter(g => g.priority != null).length || 0;

      // Total AUM in billions
      const totalAumNum = gps?.reduce((sum, g) => sum + (g.aum_numeric || 0), 0) || 0;
      const totalAumInBillions = totalAumNum / 1_000_000_000;
      const totalAum = totalAumInBillions > 0 
        ? `$${totalAumInBillions.toFixed(1)}B`
        : "$0B";

      // AUM Range
      const aumValues = gps?.filter(g => g.aum_numeric != null).map(g => g.aum_numeric!) || [];
      let aumRange = "N/A";
      if (aumValues.length > 0) {
        const minAum = Math.min(...aumValues) / 1_000_000_000;
        const maxAum = Math.max(...aumValues) / 1_000_000_000;
        aumRange = minAum === maxAum
          ? `$${minAum.toFixed(1)}B`
          : `$${minAum.toFixed(1)}B - $${maxAum.toFixed(1)}B`;
      }

      setStats({
        totalGps,
        filteredPriorityCount,
        totalAum,
        aumRange,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching horizon GP stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}
