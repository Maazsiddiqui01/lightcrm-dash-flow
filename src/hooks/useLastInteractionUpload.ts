import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to fetch the most recent interaction upload timestamp
 * Returns the MAX(created_at) from emails_meetings_raw table
 */
export function useLastInteractionUpload() {
  return useQuery({
    queryKey: ["last-interaction-upload"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emails_meetings_raw")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data?.created_at ? new Date(data.created_at) : null;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 4 * 60 * 1000, // Consider stale after 4 minutes
  });
}
