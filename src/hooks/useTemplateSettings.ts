import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PhraseLibraryItem {
  id: string;
  template_id: string;
  scope: string;
  focus_area_label?: string;
  text_value: string;
  tri_state: 'Always' | 'Sometimes' | 'Never';
  style?: string;
  weight: number;
  active: boolean;
}

export interface TemplateSettings {
  template_id: string;
  core_overrides: {
    maxLagDays?: number;
    tone?: 'auto' | 'casual' | 'neutral' | 'formal';
    length?: 'auto' | 'brief' | 'mid' | 'long';
    subjectPools?: string[];
    meetingRequest?: 'Always' | 'Sometimes' | 'Never';
  };
  modules: {
    order: string[];
    triState: Record<string, 'Always' | 'Sometimes' | 'Never'>;
  };
  personalization: Record<string, any>;
  sometimes_weights: Record<string, any>;
}

const DEFAULT_MODULES = [
  'Top Opportunities',
  'Article Recommendations',
  'Platforms',
  'Add-ons',
  'Suggested Talking Points',
  'General Org Update',
  'Attachments'
];

export function useTemplateSettings(templateId: string | null) {
  return useQuery({
    queryKey: ['template_settings', templateId],
    queryFn: async (): Promise<TemplateSettings | null> => {
      if (!templateId) return null;
      
      try {
        const { data, error } = await supabase
          .from('email_template_settings' as any)
          .select('*')
          .eq('template_id', templateId)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          // Return default settings if none exist
          return {
            template_id: templateId,
            core_overrides: {
              maxLagDays: 30,
              tone: 'auto',
              length: 'auto',
              subjectPools: ['formal'],
              meetingRequest: 'Sometimes'
            },
            modules: {
              order: DEFAULT_MODULES,
              triState: DEFAULT_MODULES.reduce((acc, module) => ({
                ...acc,
                [module]: 'Sometimes' as const
              }), {})
            },
            personalization: {},
            sometimes_weights: {}
          };
        }

        return data as unknown as TemplateSettings;
      } catch (error) {
        console.error('Failed to fetch template settings:', error);
        // Return default settings on error
        return {
          template_id: templateId,
          core_overrides: {
            maxLagDays: 30,
            tone: 'auto',
            length: 'auto',
            subjectPools: ['formal'],
            meetingRequest: 'Sometimes'
          },
          modules: {
            order: DEFAULT_MODULES,
            triState: DEFAULT_MODULES.reduce((acc, module) => ({
              ...acc,
              [module]: 'Sometimes' as const
            }), {})
          },
          personalization: {},
          sometimes_weights: {}
        };
      }
    },
    enabled: !!templateId,
  });
}

export function usePhraseLibrary(templateId: string | null) {
  return useQuery({
    queryKey: ['phrase_library', templateId],
    queryFn: async (): Promise<PhraseLibraryItem[]> => {
      if (!templateId) return [];
      
      try {
        const { data, error } = await supabase
          .from('phrase_library' as any)
          .select('*')
          .eq('template_id', templateId)
          .order('scope')
          .order('weight');

        if (error) throw error;
        return (data || []) as unknown as PhraseLibraryItem[];
      } catch (error) {
        console.error('Failed to fetch phrase library:', error);
        return [];
      }
    },
    enabled: !!templateId,
  });
}

export function useUpdateTemplateSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: TemplateSettings) => {
      const { data, error } = await supabase
        .from('email_template_settings' as any)
        .upsert(settings, { onConflict: 'template_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template_settings'] });
      toast({
        title: "Settings Updated",
        description: "Template settings have been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update template settings",
        variant: "destructive",
      });
    },
  });
}

export function useUpdatePhraseLibrary() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, phrases }: { templateId: string; phrases: PhraseLibraryItem[] }) => {
      // Delete existing phrases for this template
      await supabase
        .from('phrase_library' as any)
        .delete()
        .eq('template_id', templateId);

      // Insert new phrases
      const { data, error } = await supabase
        .from('phrase_library' as any)
        .insert(phrases.map(phrase => ({
          ...phrase,
          template_id: templateId,
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['phrase_library', variables.templateId] });
      toast({
        title: "Phrases Updated",
        description: "Phrase library has been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed", 
        description: error.message || "Failed to update phrase library",
        variant: "destructive",
      });
    },
  });
}