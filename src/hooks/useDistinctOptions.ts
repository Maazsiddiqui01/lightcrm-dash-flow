import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Option {
  value: string;
  label: string;
}

// Generic useDistinctOptions function
interface UseDistinctOptionsProps {
  search?: string;
  enabled?: boolean;
  isCommaSeparated?: boolean;
}

export function useDistinctOptions(table: string, column: string, options: UseDistinctOptionsProps = {}) {
  const { search = '', enabled = true, isCommaSeparated = false } = options;
  
  return useQuery({
    queryKey: ['distinct-options', table, column, search, isCommaSeparated],
    queryFn: async () => {
      // Direct query approach
      const { data, error } = await supabase
        .from(table as any)
        .select(`${column}`, { head: false })
        .not(column, 'is', null)
        .neq(column, '')
        .order(column, { ascending: true })
        .limit(1000);

      if (error) throw error;

      const uniqueValues = new Set<string>();
      
      (data || []).forEach((row: any) => {
        const value = row[column];
        if (value && typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed) {
            if (isCommaSeparated) {
              // Split comma-separated values and add each individually
              const splitValues = trimmed.split(',').map(v => v.trim()).filter(v => v);
              splitValues.forEach(splitValue => uniqueValues.add(splitValue));
            } else {
              uniqueValues.add(trimmed);
            }
          }
        }
      });

      let result = Array.from(uniqueValues);
      
      // Apply search filter if provided
      if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(value => value.toLowerCase().includes(searchLower));
      }

      return result
        .sort()
        .map(value => ({ value, label: value }));
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Opportunities hooks with direct queries
export const useOpportunityFocusAreas = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-focus-areas', search],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('lg_focus_area', { head: false })
        .not('lg_focus_area', 'is', null)
        .neq('lg_focus_area', '');
      
      if (search) {
        query = query.ilike('lg_focus_area', `%${search}%`);
      }
      
      const { data, error } = await query.order('lg_focus_area').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.lg_focus_area?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunityOwnershipTypes = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-ownership-types', search],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('ownership_type', { head: false })
        .not('ownership_type', 'is', null)
        .neq('ownership_type', '');
      
      if (search) {
        query = query.ilike('ownership_type', `%${search}%`);
      }
      
      const { data, error } = await query.order('ownership_type').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.ownership_type?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunityTiers = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-tiers', search],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('tier', { head: false })
        .not('tier', 'is', null)
        .neq('tier', '');
      
      if (search) {
        query = query.ilike('tier', `%${search}%`);
      }
      
      const { data, error } = await query.order('tier').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.tier?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunityStatuses = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-statuses', search],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('status', { head: false })
        .not('status', 'is', null)
        .neq('status', '');
      
      if (search) {
        query = query.ilike('status', `%${search}%`);
      }
      
      const { data, error } = await query.order('status').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.status?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunitySectors = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-sectors', search],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('sector', { head: false })
        .not('sector', 'is', null)
        .neq('sector', '');
      
      if (search) {
        query = query.ilike('sector', `%${search}%`);
      }
      
      const { data, error } = await query.order('sector').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.sector?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunityLeads = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-leads', search],
    queryFn: async () => {
      const [data1, data2] = await Promise.all([
        supabase
          .from('opportunities_raw')
          .select('investment_professional_point_person_1', { head: false })
          .not('investment_professional_point_person_1', 'is', null)
          .neq('investment_professional_point_person_1', '')
          .order('investment_professional_point_person_1')
          .limit(1000)
          .then(r => r.data || []),
        supabase
          .from('opportunities_raw')
          .select('investment_professional_point_person_2', { head: false })
          .not('investment_professional_point_person_2', 'is', null)
          .neq('investment_professional_point_person_2', '')
          .order('investment_professional_point_person_2')
          .limit(1000)
          .then(r => r.data || [])
      ]);
      
      const uniqueValues = new Set<string>();
      data1.forEach(row => {
        const value = row.investment_professional_point_person_1?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      data2.forEach(row => {
        const value = row.investment_professional_point_person_2?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      let values = Array.from(uniqueValues);
      if (search) {
        const searchLower = search.toLowerCase();
        values = values.filter(v => v.toLowerCase().includes(searchLower));
      }
      
      return values
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunityPlatformAddOn = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-platform-addon', search],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('platform_add_on', { head: false })
        .not('platform_add_on', 'is', null)
        .neq('platform_add_on', '');
      
      if (search) {
        query = query.ilike('platform_add_on', `%${search}%`);
      }
      
      const { data, error } = await query.order('platform_add_on').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.platform_add_on?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunityReferralContacts = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-referral-contacts', search],
    queryFn: async () => {
      const [data1, data2] = await Promise.all([
        supabase
          .from('opportunities_raw')
          .select('deal_source_individual_1', { head: false })
          .not('deal_source_individual_1', 'is', null)
          .neq('deal_source_individual_1', '')
          .order('deal_source_individual_1')
          .limit(1000)
          .then(r => r.data || []),
        supabase
          .from('opportunities_raw')
          .select('deal_source_individual_2', { head: false })
          .not('deal_source_individual_2', 'is', null)
          .neq('deal_source_individual_2', '')
          .order('deal_source_individual_2')
          .limit(1000)
          .then(r => r.data || [])
      ]);
      
      const uniqueValues = new Set<string>();
      data1.forEach(row => {
        const value = row.deal_source_individual_1?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      data2.forEach(row => {
        const value = row.deal_source_individual_2?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      let values = Array.from(uniqueValues);
      if (search) {
        const searchLower = search.toLowerCase();
        values = values.filter(v => v.toLowerCase().includes(searchLower));
      }
      
      return values
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunityReferralCompanies = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-referral-companies', search],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('deal_source_company', { head: false })
        .not('deal_source_company', 'is', null)
        .neq('deal_source_company', '');
      
      if (search) {
        query = query.ilike('deal_source_company', `%${search}%`);
      }
      
      const { data, error } = await query.order('deal_source_company').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.deal_source_company?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useOpportunityDatesOfOrigination = (search?: string) => {
  return useQuery({
    queryKey: ['opportunity-dates-origination', search],
    queryFn: async () => {
      let query = supabase
        .from('opportunities_raw')
        .select('date_of_origination', { head: false })
        .not('date_of_origination', 'is', null)
        .neq('date_of_origination', '');
      
      if (search) {
        query = query.ilike('date_of_origination', `%${search}%`);
      }
      
      const { data, error } = await query.order('date_of_origination').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.date_of_origination?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

// Contacts hooks
export const useContactSectors = (search?: string) => {
  return useQuery({
    queryKey: ['contact-sectors', search],
    queryFn: async () => {
      let query = supabase
        .from('contacts_app')
        .select('lg_sector', { head: false })
        .not('lg_sector', 'is', null)
        .neq('lg_sector', '');
      
      if (search) {
        query = query.ilike('lg_sector', `%${search}%`);
      }
      
      const { data, error } = await query.order('lg_sector').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.lg_sector?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useContactCategories = (search?: string) => {
  return useQuery({
    queryKey: ['contact-categories', search],
    queryFn: async () => {
      let query = supabase
        .from('contacts_app')
        .select('category', { head: false })
        .not('category', 'is', null)
        .neq('category', '');
      
      if (search) {
        query = query.ilike('category', `%${search}%`);
      }
      
      const { data, error } = await query.order('category').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.category?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useContactOrganizations = (search?: string) => {
  return useQuery({
    queryKey: ['contact-organizations', search],
    queryFn: async () => {
      let query = supabase
        .from('contacts_app')
        .select('organization', { head: false })
        .not('organization', 'is', null)
        .neq('organization', '');
      
      if (search) {
        query = query.ilike('organization', `%${search}%`);
      }
      
      const { data, error } = await query.order('organization').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.organization?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useContactTitles = (search?: string) => {
  return useQuery({
    queryKey: ['contact-titles', search],
    queryFn: async () => {
      let query = supabase
        .from('contacts_app')
        .select('title', { head: false })
        .not('title', 'is', null)
        .neq('title', '');
      
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      
      const { data, error } = await query.order('title').limit(1000);
      if (error) throw error;
      
      const uniqueValues = new Set<string>();
      (data || []).forEach(row => {
        const value = row.title?.toString().trim();
        if (value) uniqueValues.add(value);
      });
      
      return Array.from(uniqueValues)
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useContactFocusAreas = (search?: string) => {
  return useQuery({
    queryKey: ['contact-focus-areas', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts_app')
        .select('lg_focus_areas_comprehensive_list', { head: false })
        .not('lg_focus_areas_comprehensive_list', 'is', null)
        .neq('lg_focus_areas_comprehensive_list', '');
      
      if (error) throw error;
      
      const uniqueAreas = new Set<string>();
      (data || []).forEach(row => {
        const areas = row.lg_focus_areas_comprehensive_list?.split(',') || [];
        areas.forEach(area => {
          const trimmed = area.trim();
          if (trimmed) uniqueAreas.add(trimmed);
        });
      });
      
      let areas = Array.from(uniqueAreas);
      if (search) {
        const searchLower = search.toLowerCase();
        areas = areas.filter(area => area.toLowerCase().includes(searchLower));
      }
      
      return areas
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useContactAreasOfSpecialization = (search?: string) => {
  return useQuery({
    queryKey: ['contact-areas-specialization', search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts_app')
        .select('areas_of_specialization', { head: false })
        .not('areas_of_specialization', 'is', null)
        .neq('areas_of_specialization', '');
      
      if (error) throw error;
      
      const uniqueAreas = new Set<string>();
      (data || []).forEach(row => {
        const areas = row.areas_of_specialization?.split(',') || [];
        areas.forEach(area => {
          const trimmed = area.trim();
          if (trimmed) uniqueAreas.add(trimmed);
        });
      });
      
      let areas = Array.from(uniqueAreas);
      if (search) {
        const searchLower = search.toLowerCase();
        areas = areas.filter(area => area.toLowerCase().includes(searchLower));
      }
      
      return areas
        .sort()
        .map(value => ({ value, label: value }));
    },
    staleTime: 10 * 60 * 1000,
  });
};