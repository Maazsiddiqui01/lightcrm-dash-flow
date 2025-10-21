import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InteractionStats {
  totalInteractions: number;
  totalEmails: number;
  totalMeetings: number;
  lastInteractionDate: string;
  loading: boolean;
}

export function useInteractionStats(): InteractionStats {
  const [stats, setStats] = useState<InteractionStats>({
    totalInteractions: 0,
    totalEmails: 0,
    totalMeetings: 0,
    lastInteractionDate: "—",
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Optimized: Single aggregated query instead of 4 separate queries
      const { data, error } = await supabase
        .from("emails_meetings_raw")
        .select("source, occurred_at")
        .order("occurred_at", { ascending: false });

      if (error) throw error;

      // Calculate stats in memory from single query result
      const totalInteractions = data?.length || 0;
      const totalEmails = data?.filter(i => i.source?.toLowerCase().includes('email')).length || 0;
      const totalMeetings = data?.filter(i => i.source?.toLowerCase().includes('meeting')).length || 0;
      const lastInteractionDate = data?.[0]?.occurred_at 
        ? new Date(data[0].occurred_at).toLocaleDateString()
        : "—";

      setStats({
        totalInteractions,
        totalEmails,
        totalMeetings,
        lastInteractionDate,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching interaction stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}