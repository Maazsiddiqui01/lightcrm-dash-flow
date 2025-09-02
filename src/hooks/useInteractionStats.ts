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
      // Total interactions
      const { count: totalInteractions } = await supabase
        .from("emails_meetings_raw")
        .select("*", { count: "exact", head: true });

      // Email interactions
      const { count: totalEmails } = await supabase
        .from("emails_meetings_raw")
        .select("*", { count: "exact", head: true })
        .ilike("source", "%email%");

      // Meeting interactions
      const { count: totalMeetings } = await supabase
        .from("emails_meetings_raw")
        .select("*", { count: "exact", head: true })
        .ilike("source", "%meeting%");

      // Last interaction date
      const { data: lastInteraction } = await supabase
        .from("emails_meetings_raw")
        .select("time")
        .order("time", { ascending: false })
        .limit(1);

      const lastInteractionDate = lastInteraction?.[0]?.time 
        ? new Date(lastInteraction[0].time).toLocaleDateString()
        : "—";

      setStats({
        totalInteractions: totalInteractions || 0,
        totalEmails: totalEmails || 0,
        totalMeetings: totalMeetings || 0,
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