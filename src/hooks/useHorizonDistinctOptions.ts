import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Option {
  value: string;
  label: string;
}

// Helper to get unique non-null values as Option[]
const uniqCasefoldAsOptions = (arr: (string | null | undefined)[]): Option[] => {
  const seen = new Set<string>();
  return arr
    .filter((v): v is string => v != null && v.trim() !== '')
    .filter(v => {
      const lower = v.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .sort((a, b) => a.localeCompare(b))
    .map(v => ({ value: v, label: v }));
};

// Company distinct options
export const useHorizonCompanySectors = () => {
  return useQuery({
    queryKey: ['horizon-company-sectors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_companies')
        .select('sector')
        .not('sector', 'is', null)
        .neq('sector', '');
      return uniqCasefoldAsOptions(data?.map(r => r.sector) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useHorizonCompanySubsectors = () => {
  return useQuery({
    queryKey: ['horizon-company-subsectors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_companies')
        .select('subsector')
        .not('subsector', 'is', null)
        .neq('subsector', '');
      return uniqCasefoldAsOptions(data?.map(r => r.subsector) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useHorizonProcessStatuses = () => {
  return useQuery({
    queryKey: ['horizon-process-statuses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lookup_horizon_process_status')
        .select('value, label')
        .order('sort_order');
      return data?.map(r => ({ value: r.value, label: r.label })) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useHorizonCompanyOwnerships = () => {
  return useQuery({
    queryKey: ['horizon-company-ownerships'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_companies')
        .select('ownership')
        .not('ownership', 'is', null)
        .neq('ownership', '');
      return uniqCasefoldAsOptions(data?.map(r => r.ownership) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useHorizonCompanyStates = () => {
  return useQuery({
    queryKey: ['horizon-company-states'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_companies')
        .select('company_hq_state')
        .not('company_hq_state', 'is', null)
        .neq('company_hq_state', '');
      return uniqCasefoldAsOptions(data?.map(r => r.company_hq_state) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useHorizonCompanySources = () => {
  return useQuery({
    queryKey: ['horizon-company-sources'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_companies')
        .select('source')
        .not('source', 'is', null)
        .neq('source', '');
      return uniqCasefoldAsOptions(data?.map(r => r.source) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useHorizonParentGps = () => {
  return useQuery({
    queryKey: ['horizon-parent-gps'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_companies')
        .select('parent_gp_name')
        .not('parent_gp_name', 'is', null)
        .neq('parent_gp_name', '');
      return uniqCasefoldAsOptions(data?.map(r => r.parent_gp_name) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

// GP distinct options
export const useHorizonGpStates = () => {
  return useQuery({
    queryKey: ['horizon-gp-states'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_gps')
        .select('fund_hq_state')
        .not('fund_hq_state', 'is', null)
        .neq('fund_hq_state', '');
      return uniqCasefoldAsOptions(data?.map(r => r.fund_hq_state) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useHorizonGpIndustrySectors = () => {
  return useQuery({
    queryKey: ['horizon-gp-industry-sectors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_gps')
        .select('industry_sector_focus')
        .not('industry_sector_focus', 'is', null)
        .neq('industry_sector_focus', '');
      
      // Split comma-separated values and dedupe
      const allSectors: string[] = [];
      data?.forEach(r => {
        if (r.industry_sector_focus) {
          r.industry_sector_focus.split(',').forEach(s => {
            const trimmed = s.trim();
            if (trimmed) allSectors.push(trimmed);
          });
        }
      });
      return uniqCasefoldAsOptions(allSectors);
    },
    staleTime: 2 * 60 * 1000,
  });
};

// LG Relationship - reuse from opportunities
export const useHorizonLgRelationships = () => {
  return useQuery({
    queryKey: ['lg-leads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_leads_directory')
        .select('lead_name')
        .order('lead_name');
      return data?.map(r => ({ value: r.lead_name, label: r.lead_name })) ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

// GP names for company autocomplete
export const useHorizonGpNames = () => {
  return useQuery({
    queryKey: ['horizon-gp-names'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_horizons_gps')
        .select('id, gp_name')
        .order('gp_name');
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
};
