import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { splitTokens, uniqCasefold, defaultOwnershipTypes, defaultPlatformAddons } from '@/lib/export/opportunityUtils';

export const useOpportunityOptions = () => {
  // Focus Areas - optimized query with distinct
  const { data: focusAreaOptions = [], isLoading: isLoadingFocusAreas } = useQuery({
    queryKey: ['opportunity-focus-areas'],
    queryFn: async () => {
      // Get distinct focus areas from lookup table (most reliable source)
      const { data: lookupData } = await supabase
        .from('lookup_focus_areas')
        .select('label')
        .order('label');
      
      if (lookupData && lookupData.length > 0) {
        return lookupData.map(r => r.label).filter(Boolean);
      }

      // Fallback: Get from opportunities only (simpler, faster)
      const { data: oppsData } = await supabase
        .from('opportunities_raw')
        .select('lg_focus_area')
        .not('lg_focus_area', 'is', null)
        .neq('lg_focus_area', '');
      
      return uniqCasefold(
        oppsData?.flatMap(r => splitTokens(r.lg_focus_area)) ?? []
      ).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (reduced from 5)
  });

  // Sectors - optimized with limit
  const { data: sectorOptions = [], isLoading: isLoadingSectors } = useQuery({
    queryKey: ['opportunity-sectors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities_raw')
        .select('sector')
        .not('sector', 'is', null)
        .neq('sector', '')
        .order('sector');
      
      return uniqCasefold(data?.map(r => r.sector).filter(Boolean) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Status options
  const { data: statusOptions = [], isLoading: isLoadingStatus } = useQuery({
    queryKey: ['opportunity-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities_raw')
        .select('status')
        .not('status', 'is', null)
        .neq('status', '')
        .order('status');
      
      return uniqCasefold(data?.map(r => r.status).filter(Boolean) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Platform/Add-on options
  const { data: platformAddonOptions = [], isLoading: isLoadingPlatformAddon } = useQuery({
    queryKey: ['opportunity-platform-addon'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities_raw')
        .select('platform_add_on')
        .not('platform_add_on', 'is', null)
        .neq('platform_add_on', '');
      
      const fromDb = uniqCasefold(data?.map(r => r.platform_add_on).filter(Boolean) ?? []);
      
      return uniqCasefold([...defaultPlatformAddons, ...fromDb])
        .sort((a, b) => a.localeCompare(b));
    },
    staleTime: 2 * 60 * 1000,
  });

  // Ownership Type options
  const { data: ownershipTypeOptions = [], isLoading: isLoadingOwnershipType } = useQuery({
    queryKey: ['opportunity-ownership-type'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities_raw')
        .select('ownership_type')
        .not('ownership_type', 'is', null)
        .neq('ownership_type', '')
        .order('ownership_type');
      
      const fromDb = uniqCasefold(data?.map(r => r.ownership_type).filter(Boolean) ?? []);
      
      return uniqCasefold([...defaultOwnershipTypes, ...fromDb]);
    },
    staleTime: 2 * 60 * 1000,
  });

  // LG Leads - from directory
  const { data: lgLeadOptions = [], isLoading: isLoadingLgLeads } = useQuery({
    queryKey: ['lg-leads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_leads_directory')
        .select('lead_name')
        .order('lead_name');
      
      return data?.map(r => r.lead_name) ?? [];
    },
    staleTime: 10 * 60 * 1000, // Longer stale time for static directory
  });

  // Deal Source Company options
  const { data: dealSourceCompanyOptions = [], isLoading: isLoadingDealSourceCompany } = useQuery({
    queryKey: ['opportunity-deal-source-company'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities_raw')
        .select('deal_source_company')
        .not('deal_source_company', 'is', null)
        .neq('deal_source_company', '')
        .order('deal_source_company');
      
      return uniqCasefold(data?.map(r => r.deal_source_company).filter(Boolean) ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    focusAreaOptions,
    sectorOptions,
    statusOptions,
    platformAddonOptions,
    ownershipTypeOptions,
    dealSourceCompanyOptions,
    lgLeadOptions,
    isLoading: isLoadingFocusAreas || isLoadingSectors || isLoadingStatus || 
               isLoadingPlatformAddon || isLoadingOwnershipType || isLoadingLgLeads ||
               isLoadingDealSourceCompany,
  };
};