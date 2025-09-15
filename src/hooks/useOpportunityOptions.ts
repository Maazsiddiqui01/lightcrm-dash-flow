import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { splitTokens, uniqCasefold, defaultOwnershipTypes, defaultPlatformAddons } from '@/lib/export/opportunityUtils';

export const useOpportunityOptions = () => {
  // Focus Areas from multiple sources
  const { data: focusAreaOptions = [], isLoading: isLoadingFocusAreas } = useQuery({
    queryKey: ['opportunity-focus-areas'],
    queryFn: async () => {
      // Get from opportunities_raw.lg_focus_area
      const { data: oppsData } = await supabase
        .from('opportunities_raw')
        .select('lg_focus_area');
      
      const fromOpps = uniqCasefold(
        oppsData?.flatMap(r => splitTokens(r.lg_focus_area)) ?? []
      );

      // Get from contacts_raw slots
      const { data: contactsData } = await supabase
        .from('contacts_raw')
        .select('lg_focus_area_1,lg_focus_area_2,lg_focus_area_3,lg_focus_area_4,lg_focus_area_5,lg_focus_area_6,lg_focus_area_7,lg_focus_area_8,lg_focus_areas_comprehensive_list');
      
      const fromContactsSlots = uniqCasefold(
        contactsData?.flatMap(r => splitTokens([
          r.lg_focus_area_1, r.lg_focus_area_2, r.lg_focus_area_3, r.lg_focus_area_4,
          r.lg_focus_area_5, r.lg_focus_area_6, r.lg_focus_area_7, r.lg_focus_area_8
        ].filter(Boolean).join(','))) ?? []
      );

      const fromContactsList = uniqCasefold(
        contactsData?.flatMap(r => splitTokens(r.lg_focus_areas_comprehensive_list)) ?? []
      );

      return uniqCasefold([...fromOpps, ...fromContactsSlots, ...fromContactsList])
        .sort((a, b) => a.localeCompare(b));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sectors
  const { data: sectorOptions = [], isLoading: isLoadingSectors } = useQuery({
    queryKey: ['opportunity-sectors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities_raw')
        .select('sector')
        .not('sector', 'is', null)
        .neq('sector', '');
      
      return uniqCasefold(data?.map(r => r.sector).filter(Boolean) ?? [])
        .sort((a, b) => a.localeCompare(b));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Status options
  const { data: statusOptions = [], isLoading: isLoadingStatus } = useQuery({
    queryKey: ['opportunity-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities_raw')
        .select('status')
        .not('status', 'is', null)
        .neq('status', '');
      
      return uniqCasefold(data?.map(r => r.status).filter(Boolean) ?? [])
        .sort((a, b) => a.localeCompare(b));
    },
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
  });

  // Ownership Type options
  const { data: ownershipTypeOptions = [], isLoading: isLoadingOwnershipType } = useQuery({
    queryKey: ['opportunity-ownership-type'],
    queryFn: async () => {
      const { data } = await supabase
        .from('opportunities_raw')
        .select('ownership_type')
        .not('ownership_type', 'is', null)
        .neq('ownership_type', '');
      
      const fromDb = uniqCasefold(data?.map(r => r.ownership_type).filter(Boolean) ?? []);
      
      return uniqCasefold([...defaultOwnershipTypes, ...fromDb])
        .sort((a, b) => a.localeCompare(b));
    },
    staleTime: 5 * 60 * 1000,
  });

  // LG Leads
  const { data: lgLeadOptions = [], isLoading: isLoadingLgLeads } = useQuery({
    queryKey: ['lg-leads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lg_leads_directory')
        .select('lead_name')
        .order('lead_name');
      
      return data?.map(r => r.lead_name) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    focusAreaOptions,
    sectorOptions,
    statusOptions,
    platformAddonOptions,
    ownershipTypeOptions,
    lgLeadOptions,
    isLoading: isLoadingFocusAreas || isLoadingSectors || isLoadingStatus || 
               isLoadingPlatformAddon || isLoadingOwnershipType || isLoadingLgLeads,
  };
};