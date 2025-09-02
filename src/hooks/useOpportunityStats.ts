import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OpportunityStats {
  totalOpportunities: number;
  activeDeals: number;
  closedWon: number;
  pipelineValue: string;
  loading: boolean;
}

export function useOpportunityStats(): OpportunityStats {
  const [stats, setStats] = useState<OpportunityStats>({
    totalOpportunities: 0,
    activeDeals: 0,
    closedWon: 0,
    pipelineValue: "$0",
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total opportunities
      const { count: totalOpportunities } = await supabase
        .from("opportunities_raw")
        .select("*", { count: "exact", head: true });

      // Active deals (not closed)
      const { count: activeDeals } = await supabase
        .from("opportunities_raw")
        .select("*", { count: "exact", head: true })
        .not("status", "ilike", "%closed%")
        .not("status", "ilike", "%won%")
        .not("status", "ilike", "%lost%");

      // Closed won deals
      const { count: closedWon } = await supabase
        .from("opportunities_raw")
        .select("*", { count: "exact", head: true })
        .or("status.ilike.%won%,status.ilike.%closed won%");

      // Pipeline value calculation (sum of EBITDA for active deals)
      const { data: activeOpportunities } = await supabase
        .from("opportunities_raw")
        .select("ebitda_in_ms")
        .not("status", "ilike", "%closed%")
        .not("status", "ilike", "%won%")
        .not("status", "ilike", "%lost%");

      const pipelineValueNum = activeOpportunities?.reduce((sum, opp) => 
        sum + (opp.ebitda_in_ms || 0), 0) || 0;
      
      const pipelineValue = `$${(pipelineValueNum).toLocaleString()}M`;

      setStats({
        totalOpportunities: totalOpportunities || 0,
        activeDeals: activeDeals || 0,
        closedWon: closedWon || 0,
        pipelineValue,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching opportunity stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}