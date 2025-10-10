import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TemplateSettings } from '@/types/phraseLibrary';

// Re-export for backward compatibility
export type { TemplateSettings } from '@/types/phraseLibrary';
export type { PhraseLibraryItem } from '@/types/phraseLibrary';

const DEFAULT_SETTINGS: Omit<TemplateSettings, 'template_id'> = {
  tone_override: null,
  length_override: null,
  subject_pool_override: null,
  days_range_config: {},
  module_states: {
    top_opportunities: 'always',
    article_recommendations: 'sometimes',
    platforms: 'sometimes',
    addons: 'sometimes',
    suggested_talking_points: 'sometimes',
    general_org_update: 'sometimes',
    attachments: 'never',
    ps: 'sometimes',
  },
  personalization_config: {
    sources: {
      user_notes: 'always',
      ai_notes: 'sometimes',
      linkedin: 'always',
      twitter: 'sometimes',
      self_personalization: 'sometimes',
      ai_backup: 'sometimes',
    },
    self_topics: [],
  },
  inquiry_config: {
    priority: ['opportunity', 'article', 'focus_area', 'generic'],
    min_inquiries: 1,
    max_inquiries: 2,
  },
  quality_rules: {
    skip_if_no_opps: false,
    skip_if_no_articles: false,
    min_personalization_score: 0,
    ebitda_threshold: 30,
  },
};

export function useTemplateSettings(templateId: string | null) {
  return useQuery({
    queryKey: ['template-settings', templateId],
    queryFn: async () => {
      if (!templateId) return { ...DEFAULT_SETTINGS, template_id: '' };

      const { data, error } = await supabase
        .from('email_template_settings')
        .select('*')
        .eq('template_id', templateId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return { ...DEFAULT_SETTINGS, template_id: templateId };
        }
        throw error;
      }

      if (!data) {
        return { ...DEFAULT_SETTINGS, template_id: templateId };
      }

      return {
        ...DEFAULT_SETTINGS,
        ...data,
        template_id: data.template_id || templateId,
        personalization_config: data.personalization_config as any || DEFAULT_SETTINGS.personalization_config,
        inquiry_config: data.inquiry_config as any || DEFAULT_SETTINGS.inquiry_config,
        quality_rules: data.quality_rules as any || DEFAULT_SETTINGS.quality_rules,
        days_range_config: data.days_range_config as any || DEFAULT_SETTINGS.days_range_config,
        module_states: data.module_states as any || DEFAULT_SETTINGS.module_states,
      } as TemplateSettings;
    },
    enabled: !!templateId,
  });
}

export function useUpdateTemplateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: TemplateSettings & {
      module_defaults?: Record<string, string>;
      subject_default_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('email_template_settings')
        .upsert({
          ...settings,
          module_defaults: settings.module_defaults || {},
          subject_default_id: settings.subject_default_id || null,
        }, { onConflict: 'template_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-settings'] });
      toast({
        title: 'Settings saved',
        description: 'Template settings have been updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}