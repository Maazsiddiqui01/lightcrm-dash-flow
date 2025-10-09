import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OpportunityStats {
  totalOpportunities: number;
  activeDeals: number;
  familyFounderPercentage: string;
  averageEbitda: string;
  loading: boolean;
}

interface OpportunityFilters {
  focusArea?: string[];
  ownershipType?: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  tier?: string[];
  status?: string[];
  sector?: string[];
  leads?: string[];
  platformAddOn?: string[];
  referralContacts?: string[];
  referralCompanies?: string[];
  dateOfOrigination?: string[];
  acquisitionDateStart?: Date;
  acquisitionDateEnd?: Date;
}

export function useOpportunityStats(filters?: OpportunityFilters): OpportunityStats {
  const [stats, setStats] = useState<OpportunityStats>({
    totalOpportunities: 0,
    activeDeals: 0,
    familyFounderPercentage: "0%",
    averageEbitda: "$0M",
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, [filters]);

  const applyFilters = (query: any) => {
    if (!filters) return query;

    // Apply focus area filter - use pattern matching for comma-separated values
    if (filters.focusArea && filters.focusArea.length > 0) {
      const focusAreaConditions = filters.focusArea.map(area => 
        `lg_focus_area.ilike.%${area}%`
      ).join(',');
      query = query.or(focusAreaConditions);
    }

    if (filters.sector && filters.sector.length > 0) {
      query = query.in('sector', filters.sector);
    }

    if (filters.tier && filters.tier.length > 0) {
      query = query.in('tier', filters.tier);
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters.ownershipType && filters.ownershipType.length > 0) {
      query = query.in('ownership_type', filters.ownershipType);
    }

    if (filters.platformAddOn && filters.platformAddOn.length > 0) {
      query = query.in('platform_add_on', filters.platformAddOn);
    }

    // LG Leads filter
    if (filters.leads && filters.leads.length > 0) {
      const lgLeadQuery = filters.leads.map(lead => 
        `investment_professional_point_person_1.ilike.%${lead}%,investment_professional_point_person_2.ilike.%${lead}%`
      ).join(',');
      query = query.or(lgLeadQuery);
    }

    // Referral contacts filter
    if (filters.referralContacts && filters.referralContacts.length > 0) {
      const contactQuery = filters.referralContacts.map(contact => 
        `deal_source_individual_1.ilike.%${contact}%,deal_source_individual_2.ilike.%${contact}%`
      ).join(',');
      query = query.or(contactQuery);
    }

    // Referral companies filter
    if (filters.referralCompanies && filters.referralCompanies.length > 0) {
      query = query.in('deal_source_company', filters.referralCompanies);
    }

    // EBITDA range filter
    if (filters.ebitdaMin !== null && filters.ebitdaMin !== undefined) {
      query = query.gte('ebitda_in_ms', filters.ebitdaMin);
    }
    if (filters.ebitdaMax !== null && filters.ebitdaMax !== undefined) {
      query = query.lte('ebitda_in_ms', filters.ebitdaMax);
    }

    // Date of origination filter
    if (filters.dateOfOrigination && filters.dateOfOrigination.length > 0) {
      const dateQueries = filters.dateOfOrigination.map(dateRange => {
        const [start, end] = dateRange.split(' to ');
        if (end) {
          return `date_of_origination.gte.${start},date_of_origination.lte.${end}`;
        }
        return `date_of_origination.gte.${start}`;
      });
      query = query.or(dateQueries.join(','));
    }

    // Acquisition date filter
    if (filters.acquisitionDateStart) {
      query = query.gte('acquisition_date', filters.acquisitionDateStart.toISOString().split('T')[0]);
    }
    if (filters.acquisitionDateEnd) {
      query = query.lte('acquisition_date', filters.acquisitionDateEnd.toISOString().split('T')[0]);
    }

    return query;
  };

  const fetchStats = async () => {
    try {
      // Optimized: Fetch all data in a single query instead of 4 separate queries
      let query = supabase
        .from("opportunities_raw")
        .select("ownership_type, ebitda_in_ms, status");
      query = applyFilters(query);
      const { data: opportunities, error } = await query;

      if (error) throw error;

      // Calculate all stats from the single query result
      const totalOpportunities = opportunities?.length || 0;
      
      const activeDeals = opportunities?.filter(opp => {
        const status = opp.status?.toLowerCase() || '';
        return !status.includes('closed') && !status.includes('won') && !status.includes('lost');
      }).length || 0;

      const familyFounderCount = opportunities?.filter(opp => {
        const ownership = opp.ownership_type?.toLowerCase() || '';
        return ownership.includes('family') || ownership.includes('founder');
      }).length || 0;
      
      const familyFounderPercentage = totalOpportunities > 0 
        ? `${Math.round((familyFounderCount / totalOpportunities) * 100)}%`
        : "0%";

      const oppsWithEbitda = opportunities?.filter(opp => opp.ebitda_in_ms != null) || [];
      const totalEbitda = oppsWithEbitda.reduce((sum, opp) => sum + (opp.ebitda_in_ms || 0), 0);
      const averageEbitdaNum = oppsWithEbitda.length > 0 
        ? totalEbitda / oppsWithEbitda.length 
        : 0;
      
      const averageEbitda = averageEbitdaNum > 0 
        ? `$${averageEbitdaNum.toFixed(1)}M`
        : "$0M";

      setStats({
        totalOpportunities,
        activeDeals,
        familyFounderPercentage,
        averageEbitda,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching opportunity stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}