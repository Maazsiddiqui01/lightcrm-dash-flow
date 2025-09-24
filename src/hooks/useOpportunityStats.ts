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

    // Apply filters
    if (filters.focusArea && filters.focusArea.length > 0) {
      query = query.in('lg_focus_area', filters.focusArea);
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
      // Total opportunities with filters
      let totalQuery = supabase
        .from("opportunities_raw")
        .select("*", { count: "exact", head: true });
      totalQuery = applyFilters(totalQuery);
      const { count: totalOpportunities } = await totalQuery;

      // Active deals (not closed) with filters
      let activeQuery = supabase
        .from("opportunities_raw")
        .select("*", { count: "exact", head: true })
        .not("status", "ilike", "%closed%")
        .not("status", "ilike", "%won%")
        .not("status", "ilike", "%lost%");
      activeQuery = applyFilters(activeQuery);
      const { count: activeDeals } = await activeQuery;

      // Family/founder owned percentage with filters
      let familyFounderQuery = supabase
        .from("opportunities_raw")
        .select("ownership_type");
      familyFounderQuery = applyFilters(familyFounderQuery);
      const { data: allOpps } = await familyFounderQuery;

      const familyFounderCount = allOpps?.filter(opp => 
        opp.ownership_type && (
          opp.ownership_type.toLowerCase().includes('family') || 
          opp.ownership_type.toLowerCase().includes('founder')
        )
      ).length || 0;
      
      const familyFounderPercentage = allOpps && allOpps.length > 0 
        ? `${Math.round((familyFounderCount / allOpps.length) * 100)}%`
        : "0%";

      // Average EBITDA calculation with filters
      let ebitdaQuery = supabase
        .from("opportunities_raw")
        .select("ebitda_in_ms")
        .not("ebitda_in_ms", "is", null);
      ebitdaQuery = applyFilters(ebitdaQuery);
      const { data: ebitdaOpps } = await ebitdaQuery;

      const totalEbitda = ebitdaOpps?.reduce((sum, opp) => sum + (opp.ebitda_in_ms || 0), 0) || 0;
      const averageEbitdaNum = ebitdaOpps && ebitdaOpps.length > 0 
        ? totalEbitda / ebitdaOpps.length 
        : 0;
      
      const averageEbitda = averageEbitdaNum > 0 
        ? `$${averageEbitdaNum.toFixed(1)}M`
        : "$0M";

      setStats({
        totalOpportunities: totalOpportunities || 0,
        activeDeals: activeDeals || 0,
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