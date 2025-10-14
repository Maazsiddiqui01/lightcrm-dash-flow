import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';

export interface ContactSettings {
  contact_id: string;
  module_states: ModuleStates;
  delta_type: 'Email' | 'Meeting';
  selected_article_id: string | null;
  module_order: string[] | null;
  module_selections: Record<string, any> | null;
  curated_recipients: {
    team?: Array<{ id: string; name: string; email: string; role: string }>;
    to?: string;
    cc?: string[];
  } | null;
  custom_module_labels?: Record<string, string>;
  
  // Default tracking
  module_defaults?: Record<string, string>;  // { "top_opportunities": "phr_123" }
  subject_default_id?: string | null;
  module_tri_states?: Record<string, string>; // Per-module tri-state
  
  last_updated: string;
  created_at: string;
}

export function useContactSettings(contactId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load settings for a contact
  const { data: settings, isLoading } = useQuery({
    queryKey: ['contact-settings', contactId],
    queryFn: async (): Promise<ContactSettings | null> => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from('contact_email_builder_settings')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Runtime migration: rename subject_line_pool to subject_line
      const moduleSelections = data.module_selections as Record<string, any> | null;
      if (moduleSelections?.subject_line_pool && !moduleSelections?.subject_line) {
        moduleSelections.subject_line = moduleSelections.subject_line_pool;
        delete moduleSelections.subject_line_pool;
      }

      return {
        ...data,
        delta_type: data.delta_type as 'Email' | 'Meeting',
        module_states: data.module_states as unknown as ModuleStates,
        module_order: data.module_order as string[] | null,
        module_selections: moduleSelections,
        curated_recipients: data.curated_recipients as any || null,
        custom_module_labels: data.custom_module_labels as Record<string, string> | undefined,
        module_defaults: data.module_defaults as Record<string, string> | undefined,
        subject_default_id: data.subject_default_id as string | null | undefined,
        module_tri_states: data.module_tri_states as Record<string, string> | undefined,
      };
    },
    enabled: !!contactId,
  });

  // Save settings for a contact
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      contactId: string;
      moduleStates: ModuleStates;
      deltaType: 'Email' | 'Meeting';
      selectedArticleId?: string | null;
      moduleOrder?: Array<keyof ModuleStates>;
      moduleSelections?: Record<string, any>;
      curatedTeam?: Array<{ id: string; name: string; email: string; role: string }>;
      curatedTo?: string;
      curatedCc?: string[];
      customModuleLabels?: Record<string, string>;
    }) => {
      // Extract defaults from module_selections
      const moduleDefaults: Record<string, string> = {};
      Object.entries(payload.moduleSelections || {}).forEach(([key, selection]) => {
        if (selection?.defaultPhraseId) {
          moduleDefaults[key] = selection.defaultPhraseId;
        }
      });
      
      const subjectDefaultId = payload.moduleSelections?.subject_line?.defaultSubjectId || null;
      
      const curatedRecipients = (payload.curatedTeam || payload.curatedTo || payload.curatedCc) ? {
        team: payload.curatedTeam || [],
        to: payload.curatedTo || '',
        cc: payload.curatedCc || [],
      } : null;

      const { data, error } = await supabase
        .from('contact_email_builder_settings')
        .upsert([{
          contact_id: payload.contactId,
          module_states: payload.moduleStates as any,
          delta_type: payload.deltaType,
          selected_article_id: payload.selectedArticleId || null,
          module_order: payload.moduleOrder || null,
          module_selections: payload.moduleSelections || null,
          curated_recipients: curatedRecipients as any,
          custom_module_labels: payload.customModuleLabels || null,
          module_defaults: moduleDefaults,
          subject_default_id: subjectDefaultId,
        }])
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        delta_type: data.delta_type as 'Email' | 'Meeting',
        module_states: data.module_states as unknown as ModuleStates,
        module_order: data.module_order as string[] | null,
        module_selections: data.module_selections as Record<string, any> | null,
        curated_recipients: data.curated_recipients as any || null,
        custom_module_labels: data.custom_module_labels as Record<string, string> | undefined,
        module_defaults: data.module_defaults as Record<string, string> | undefined,
        subject_default_id: data.subject_default_id as string | null | undefined,
        module_tri_states: data.module_tri_states as Record<string, string> | undefined,
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['contact-settings', data.contact_id], data);
      toast({
        title: "Settings Saved",
        description: "Your preferences for this contact have been saved.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to save contact settings:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // Delete settings for a contact (reset to defaults)
  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('contact_email_builder_settings')
        .delete()
        .eq('contact_id', contactId);

      if (error) throw error;
    },
    onSuccess: (_, contactId) => {
      queryClient.setQueryData(['contact-settings', contactId], null);
      toast({
        title: "Settings Reset",
        description: "Contact settings have been reset to template defaults.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to delete contact settings:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset settings",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    resetSettings: deleteMutation.mutate,
    isResetting: deleteMutation.isPending,
  };
}
