import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TemplateSettings } from '@/types/phraseLibrary';

const DEFAULT_SETTINGS: Omit<TemplateSettings, 'template_id'> = {
  tone_override: null,
  length_override: null,
  subject_pool_override: null,
  days_range_config: {},
  module_states: {
    top_opportunities: 'sometimes',
    article_recommendations: 'sometimes',
    platforms: 'sometimes',
    addons: 'sometimes',
    suggested_talking_points: 'always',
    general_org_update: 'sometimes',
    attachments: 'never',
    ps: 'sometimes',
  },
  personalization_config: {
    sources: {
      user_notes: 'always',
      ai_notes: 'sometimes',
      linkedin: 'sometimes',
      twitter: 'sometimes',
      self_personalization: 'sometimes',
      ai_backup: 'sometimes',
    },
    self_topics: ['Sports', 'Books', 'Travel', 'Food', 'Music'],
  },
  inquiry_config: {
    priority: ['opportunity', 'article', 'focus_area', 'generic'],
    min_inquiries: 1,
    max_inquiries: 2,
  },
  quality_rules: {
    skip_if_no_opps: false,
    skip_if_no_articles: false,
    min_personalization_score: 0.3,
    ebitda_threshold: 35,
  },
  custom_module_labels: {},
};

export function useNewTemplateSettings(templateId: string | null) {
  return useQuery({
    queryKey: ['new-template-settings', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('email_template_settings' as any)
        .select('*')
        .eq('template_id', templateId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return { template_id: templateId, ...DEFAULT_SETTINGS };
      }

      return data as unknown as TemplateSettings;
    },
    enabled: templateId !== null,
  });
}

export function useUpdateNewTemplateSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: TemplateSettings) => {
      const { data, error } = await supabase
        .from('email_template_settings' as any)
        .upsert(settings as any, { onConflict: 'template_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['new-template-settings', variables.template_id] });
      toast({
        title: 'Settings saved',
        description: 'Template settings have been updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
