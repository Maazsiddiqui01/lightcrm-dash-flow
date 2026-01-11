import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseFlexibleDate } from "@/utils/dateUtils";
import { fetchAllPaged } from "@/utils/supabaseFetchAll";

interface HorizonCompanyStats {
  totalCompanies: number;
  filteredPriorityCount: number;
  gpAumRange: string;
  acquisitionDateRange: string;
  loading: boolean;
}

interface HorizonCompanyFilters {
  sector?: string[];
  subsector?: string[];
  processStatus?: string[];
  ownership?: string[];
  priority?: string[];
  lgRelationship?: string[];
  ebitdaMin?: number;
  ebitdaMax?: number;
  revenueMin?: number;
  revenueMax?: number;
  gpAumMin?: number;
  gpAumMax?: number;
  state?: string[];
  city?: string[];
  source?: string[];
  parentGp?: string[];
  dateOfAcquisitionStart?: string;
  dateOfAcquisitionEnd?: string;
}

export function useHorizonCompanyStats(filters?: HorizonCompanyFilters): HorizonCompanyStats {
  const [stats, setStats] = useState<HorizonCompanyStats>({
    totalCompanies: 0,
    filteredPriorityCount: 0,
    gpAumRange: "N/A",
    acquisitionDateRange: "N/A",
    loading: true,
  });

  useEffect(() => {
    fetchStats();
  }, [JSON.stringify(filters)]);

  const applyFilters = (query: any) => {
    if (!filters) return query;

    if (filters.sector && filters.sector.length > 0) {
      query = query.in('sector', filters.sector);
    }

    if (filters.subsector && filters.subsector.length > 0) {
      query = query.in('subsector', filters.subsector);
    }

    if (filters.processStatus && filters.processStatus.length > 0) {
      query = query.in('process_status', filters.processStatus);
    }

    if (filters.ownership && filters.ownership.length > 0) {
      query = query.in('ownership', filters.ownership);
    }

    if (filters.priority && filters.priority.length > 0) {
      const priorityValues = filters.priority.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (priorityValues.length > 0) {
        query = query.in('priority', priorityValues);
      }
    }

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

    if (filters.ebitdaMin !== null && filters.ebitdaMin !== undefined) {
      query = query.gte('ebitda_numeric', filters.ebitdaMin);
    }
    if (filters.ebitdaMax !== null && filters.ebitdaMax !== undefined) {
      query = query.lte('ebitda_numeric', filters.ebitdaMax);
    }

    if (filters.revenueMin !== null && filters.revenueMin !== undefined) {
      query = query.gte('revenue_numeric', filters.revenueMin);
    }
    if (filters.revenueMax !== null && filters.revenueMax !== undefined) {
      query = query.lte('revenue_numeric', filters.revenueMax);
    }

    if (filters.gpAumMin !== null && filters.gpAumMin !== undefined) {
      query = query.gte('gp_aum_numeric', filters.gpAumMin);
    }
    if (filters.gpAumMax !== null && filters.gpAumMax !== undefined) {
      query = query.lte('gp_aum_numeric', filters.gpAumMax);
    }

    if (filters.state && filters.state.length > 0) {
      query = query.in('company_hq_state', filters.state);
    }

    if (filters.city && filters.city.length > 0) {
      query = query.in('company_hq_city', filters.city);
    }

    if (filters.source && filters.source.length > 0) {
      query = query.in('source', filters.source);
    }

    if (filters.parentGp && filters.parentGp.length > 0) {
      query = query.in('parent_gp_name', filters.parentGp);
    }

    // Note: date_of_acquisition filtering is done client-side in fetchStats because it's stored as text

    return query;
  };

  const fetchStats = async () => {
    try {
      // Use paged fetching to get all companies (bypasses 1000 row limit)
      const makeQuery = (from: number, to: number) => {
        let query = supabase
          .from("lg_horizons_companies")
          .select("priority, gp_aum_numeric, date_of_acquisition")
          .range(from, to)
          .order('id', { ascending: true });
        return applyFilters(query);
      };

      let companies = await fetchAllPaged<{
        priority: number | null;
        gp_aum_numeric: number | null;
        date_of_acquisition: string | null;
      }>(makeQuery);

      // Apply date of acquisition filter client-side (stored as text in various formats)
      if (filters?.dateOfAcquisitionStart) {
        const startDate = parseFlexibleDate(filters.dateOfAcquisitionStart);
        if (startDate) {
          companies = companies.filter(c => {
            if (!c.date_of_acquisition) return false;
            const acqDate = parseFlexibleDate(c.date_of_acquisition);
            return acqDate && acqDate >= startDate;
          });
        }
      }
      if (filters?.dateOfAcquisitionEnd) {
        const endDate = parseFlexibleDate(filters.dateOfAcquisitionEnd);
        if (endDate) {
          companies = companies.filter(c => {
            if (!c.date_of_acquisition) return false;
            const acqDate = parseFlexibleDate(c.date_of_acquisition);
            return acqDate && acqDate <= endDate;
          });
        }
      }

      const totalCompanies = companies.length;
      
      // Count all records that have a priority set
      const filteredPriorityCount = companies.filter(c => c.priority != null).length;

      // Calculate GP AUM Range
      const aumValues = companies.filter(c => c.gp_aum_numeric != null).map(c => c.gp_aum_numeric!);
      let gpAumRange = "N/A";
      if (aumValues.length > 0) {
        const minAum = Math.min(...aumValues) / 1_000_000_000;
        const maxAum = Math.max(...aumValues) / 1_000_000_000;
        gpAumRange = minAum === maxAum 
          ? `$${minAum.toFixed(1)}B`
          : `$${minAum.toFixed(1)}B - $${maxAum.toFixed(1)}B`;
      }

      // Calculate Acquisition Date Range
      const acquisitionDates = companies
        .filter(c => c.date_of_acquisition)
        .map(c => parseFlexibleDate(c.date_of_acquisition!))
        .filter((d): d is Date => d !== null);

      let acquisitionDateRange = "N/A";
      if (acquisitionDates.length > 0) {
        const sortedDates = acquisitionDates.sort((a, b) => a.getTime() - b.getTime());
        const minDate = sortedDates[0];
        const maxDate = sortedDates[sortedDates.length - 1];
        acquisitionDateRange = minDate.getTime() === maxDate.getTime()
          ? format(minDate, 'MMM yyyy')
          : `${format(minDate, 'MMM yyyy')} - ${format(maxDate, 'MMM yyyy')}`;
      }

      setStats({
        totalCompanies,
        filteredPriorityCount,
        gpAumRange,
        acquisitionDateRange,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching horizon company stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}
