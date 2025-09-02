import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ContactStats {
  totalContacts: number;
  activeContacts: number;
  totalEmails: number;
  totalMeetings: number;
  loading: boolean;
}

export function useContactStats(): ContactStats {
  const [stats, setStats] = useState<ContactStats>({
    totalContacts: 0,
    activeContacts: 0,
    totalEmails: 0,
    totalMeetings: 0,
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total contacts
      const { count: totalContacts } = await supabase
        .from("contacts_app")
        .select("*", { count: "exact", head: true });

      // Active contacts (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { count: activeContacts } = await supabase
        .from("contacts_app")
        .select("*", { count: "exact", head: true })
        .gte("most_recent_contact", ninetyDaysAgo.toISOString());

      // Total emails and meetings from contacts
      const { data: contactsWithStats } = await supabase
        .from("contacts_app")
        .select("of_emails, of_meetings");

      const totalEmails = contactsWithStats?.reduce((sum, contact) => 
        sum + ((contact as any).of_emails || 0), 0) || 0;
      
      const totalMeetings = contactsWithStats?.reduce((sum, contact) => 
        sum + ((contact as any).of_meetings || 0), 0) || 0;

      setStats({
        totalContacts: totalContacts || 0,
        activeContacts: activeContacts || 0,
        totalEmails,
        totalMeetings,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching contact stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}