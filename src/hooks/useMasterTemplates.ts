import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MasterTemplateDefaults } from '@/types/phraseLibrary';

export function useMasterTemplates() {
  const query = useQuery({
    queryKey: ['master-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_template_defaults' as any)
        .select('*')
        .order('days_min', { ascending: true });

      if (error) throw error;
      return data as unknown as MasterTemplateDefaults[];
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useMasterTemplateForDays(daysSinceContact: number) {
  const { data: templates } = useMasterTemplates();

  if (!templates) return null;

  // Find the appropriate master template based on days
  for (const template of templates) {
    if (daysSinceContact >= template.days_min) {
      if (template.days_max === null || daysSinceContact <= template.days_max) {
        return template;
      }
    }
  }

  // Default to last template if no match
  return templates[templates.length - 1];
}

export function getMasterKeyForDays(daysSinceContact: number): 'relationship_maintenance' | 'hybrid_neutral' | 'business_development' {
  if (daysSinceContact <= 45) return 'relationship_maintenance';
  if (daysSinceContact <= 90) return 'hybrid_neutral';
  return 'business_development';
}
