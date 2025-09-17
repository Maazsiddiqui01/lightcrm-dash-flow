import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ContactStats {
  totalContacts: number;
  activeContacts: number;
  totalEmails: number;
  totalMeetings: number;
  loading: boolean;
}

interface ContactFilters {
  focusAreas?: string[];
  sectors?: string[];
  areasOfSpecialization?: string[];
  mostRecentContactStart?: string;
  mostRecentContactEnd?: string;
  deltaType?: string[];
  deltaMin?: number;
  deltaMax?: number;
  organizations?: string[];
  titles?: string[];
  categories?: string[];
  hasOpportunities?: string[];
}

export function useContactStats(filters?: ContactFilters): ContactStats {
  const [stats, setStats] = useState<ContactStats>({
    totalContacts: 0,
    activeContacts: 0,
    totalEmails: 0,
    totalMeetings: 0,
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, [filters]);

  const applyFilters = (query: any) => {
    if (!filters) return query;

    // Focus areas filter - need to check multiple focus area columns
    if (filters.focusAreas && filters.focusAreas.length > 0) {
      const focusAreaConditions = filters.focusAreas.map(area => {
        return [
          `lg_focus_area_1.eq.${area}`,
          `lg_focus_area_2.eq.${area}`,
          `lg_focus_area_3.eq.${area}`,
          `lg_focus_area_4.eq.${area}`,
          `lg_focus_area_5.eq.${area}`,
          `lg_focus_area_6.eq.${area}`,
          `lg_focus_area_7.eq.${area}`,
          `lg_focus_area_8.eq.${area}`
        ].join(',');
      });
      query = query.or(focusAreaConditions.join(','));
    }

    // Sectors filter
    if (filters.sectors && filters.sectors.length > 0) {
      query = query.in('lg_sector', filters.sectors);
    }

    // Areas of specialization filter
    if (filters.areasOfSpecialization && filters.areasOfSpecialization.length > 0) {
      const areaConditions = filters.areasOfSpecialization.map(area => 
        `areas_of_specialization.ilike.%${area}%`
      ).join(',');
      query = query.or(areaConditions);
    }

    // Organizations filter
    if (filters.organizations && filters.organizations.length > 0) {
      query = query.in('organization', filters.organizations);
    }

    // Titles filter
    if (filters.titles && filters.titles.length > 0) {
      query = query.in('title', filters.titles);
    }

    // Categories filter
    if (filters.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories);
    }

    // Delta type filter
    if (filters.deltaType && filters.deltaType.length > 0) {
      query = query.in('delta_type', filters.deltaType);
    }

    // Has opportunities filter
    if (filters.hasOpportunities && filters.hasOpportunities.length > 0) {
      filters.hasOpportunities.forEach(hasOpp => {
        if (hasOpp === 'Yes') {
          query = query.gt('no_of_opps_sourced', 0);
        } else if (hasOpp === 'No') {
          query = query.or('no_of_opps_sourced.is.null,no_of_opps_sourced.eq.0');
        }
      });
    }

    // Most recent contact date range
    if (filters.mostRecentContactStart) {
      query = query.gte('most_recent_contact', filters.mostRecentContactStart);
    }
    if (filters.mostRecentContactEnd) {
      query = query.lte('most_recent_contact', filters.mostRecentContactEnd);
    }

    // Delta range filter (days since last contact)
    if (filters.deltaMin !== null && filters.deltaMin !== undefined) {
      query = query.gte('delta', filters.deltaMin);
    }
    if (filters.deltaMax !== null && filters.deltaMax !== undefined) {
      query = query.lte('delta', filters.deltaMax);
    }

    return query;
  };

  const fetchStats = async () => {
    try {
      // Total contacts with filters
      let totalQuery = supabase
        .from("contacts_app")
        .select("*", { count: "exact", head: true });
      totalQuery = applyFilters(totalQuery);
      const { count: totalContacts } = await totalQuery;

      // Active contacts (last 90 days) with filters
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      let activeQuery = supabase
        .from("contacts_app")
        .select("*", { count: "exact", head: true })
        .gte("most_recent_contact", ninetyDaysAgo.toISOString());
      activeQuery = applyFilters(activeQuery);
      const { count: activeContacts } = await activeQuery;

      // Total emails and meetings from contacts with filters
      let statsQuery = supabase
        .from("contacts_app")
        .select("of_emails, of_meetings");
      statsQuery = applyFilters(statsQuery);
      const { data: contactsWithStats } = await statsQuery;

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