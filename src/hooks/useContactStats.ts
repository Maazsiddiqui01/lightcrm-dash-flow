import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ContactStats {
  totalContacts: number;
  activeContacts: number;
  totalEmails: number;
  totalMeetings: number;
  loading: boolean;
}

interface OpportunityFilters {
  tier?: string[];
  platformAddon?: string[];
  ownershipType?: string[];
  status?: string[];
  lgLead?: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  ebitdaMin?: number;
  ebitdaMax?: number;
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
  lgLead?: string[];
  opportunityFilters?: OpportunityFilters;
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

    // Focus areas filter - check both individual columns and comprehensive list with fuzzy matching
    if (filters.focusAreas && filters.focusAreas.length > 0) {
      const focusAreaConditions: string[] = [];
      
      filters.focusAreas.forEach(area => {
        // Create conditions that check all focus area fields with fuzzy matching
        const areaConditions = [
          `lg_focus_area_1.ilike.%${area}%`,
          `lg_focus_area_2.ilike.%${area}%`,
          `lg_focus_area_3.ilike.%${area}%`,
          `lg_focus_area_4.ilike.%${area}%`,
          `lg_focus_area_5.ilike.%${area}%`,
          `lg_focus_area_6.ilike.%${area}%`,
          `lg_focus_area_7.ilike.%${area}%`,
          `lg_focus_area_8.ilike.%${area}%`,
          `lg_focus_areas_comprehensive_list.ilike.%${area}%`
        ];
        
        focusAreaConditions.push(`(${areaConditions.join(',')})`);
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
      // Check if opportunity filters are applied
      const opportunityFilters = filters?.opportunityFilters || {};
      const hasOpportunityFilters = opportunityFilters.tier?.length > 0 || 
        opportunityFilters.platformAddon?.length > 0 || 
        opportunityFilters.ownershipType?.length > 0 || 
        opportunityFilters.status?.length > 0 || 
        opportunityFilters.lgLead?.length > 0 || 
        opportunityFilters.dateRangeStart || 
        opportunityFilters.dateRangeEnd ||
        (opportunityFilters.ebitdaMin !== null && opportunityFilters.ebitdaMin !== undefined) ||
        (opportunityFilters.ebitdaMax !== null && opportunityFilters.ebitdaMax !== undefined);

      let filteredContactIds: string[] | null = null;

      // If opportunity filters are applied, get matching contact IDs first
      if (hasOpportunityFilters) {
        let oppQuery = supabase
          .from("opportunities_raw")
          .select("deal_source_individual_1, deal_source_individual_2");

        // Apply opportunity filters
        if (opportunityFilters.tier?.length > 0) {
          oppQuery = oppQuery.in('tier', opportunityFilters.tier);
        }
        if (opportunityFilters.platformAddon?.length > 0) {
          oppQuery = oppQuery.in('platform_add_on', opportunityFilters.platformAddon);
        }
        if (opportunityFilters.ownershipType?.length > 0) {
          oppQuery = oppQuery.in('ownership_type', opportunityFilters.ownershipType);
        }
        if (opportunityFilters.status?.length > 0) {
          oppQuery = oppQuery.in('status', opportunityFilters.status);
        }
        if (opportunityFilters.lgLead?.length > 0) {
          const leadQuery = opportunityFilters.lgLead.map(lead => 
            `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
          ).join(',');
          oppQuery = oppQuery.or(leadQuery);
        }
        if (opportunityFilters.ebitdaMin !== null && opportunityFilters.ebitdaMin !== undefined) {
          oppQuery = oppQuery.gte('ebitda_in_ms', opportunityFilters.ebitdaMin);
        }
        if (opportunityFilters.ebitdaMax !== null && opportunityFilters.ebitdaMax !== undefined) {
          oppQuery = oppQuery.lte('ebitda_in_ms', opportunityFilters.ebitdaMax);
        }
        if (opportunityFilters.dateRangeStart) {
          oppQuery = oppQuery.gte('date_of_origination', opportunityFilters.dateRangeStart);
        }
        if (opportunityFilters.dateRangeEnd) {
          oppQuery = oppQuery.lte('date_of_origination', opportunityFilters.dateRangeEnd);
        }

        const { data: opportunities } = await oppQuery;
        
        if (opportunities && opportunities.length > 0) {
          const contactNames = new Set<string>();
          opportunities.forEach(opp => {
            if (opp.deal_source_individual_1) {
              contactNames.add(opp.deal_source_individual_1.toLowerCase().trim());
            }
            if (opp.deal_source_individual_2) {
              contactNames.add(opp.deal_source_individual_2.toLowerCase().trim());
            }
          });

          // Get contact IDs for these names
          if (contactNames.size > 0) {
            const nameQueries = Array.from(contactNames).map(name => `full_name.ilike.${name}`).join(',');
            const { data: matchingContacts } = await supabase
              .from("contacts_raw")
              .select("id")
              .or(nameQueries);
            
            filteredContactIds = matchingContacts?.map(c => c.id) || [];
          } else {
            filteredContactIds = [];
          }
        } else {
          filteredContactIds = [];
        }
      }

      // Build base queries with contact filters - use contacts_raw for consistency
      let totalQuery = supabase
        .from("contacts_raw")
        .select("*", { count: "exact", head: true });
      totalQuery = applyFilters(totalQuery);

      let activeQuery = supabase
        .from("contacts_raw")
        .select("*", { count: "exact", head: true });
      activeQuery = applyFilters(activeQuery);

      let statsQuery = supabase
        .from("contacts_raw")
        .select("of_emails, of_meetings");
      statsQuery = applyFilters(statsQuery);

      // Apply opportunity-based contact filtering if needed
      if (filteredContactIds !== null) {
        if (filteredContactIds.length > 0) {
          totalQuery = totalQuery.in('id', filteredContactIds);
          activeQuery = activeQuery.in('id', filteredContactIds);
          statsQuery = statsQuery.in('id', filteredContactIds);
        } else {
          // No contacts match opportunity filters, return zero stats
          setStats({
            totalContacts: 0,
            activeContacts: 0,
            totalEmails: 0,
            totalMeetings: 0,
            loading: false,
          });
          return;
        }
      }

      // Apply active contacts date filter
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      activeQuery = activeQuery.gte("most_recent_contact", ninetyDaysAgo.toISOString());

      // Execute queries
      const { count: totalContacts } = await totalQuery;
      const { count: activeContacts } = await activeQuery;
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