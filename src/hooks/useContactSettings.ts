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

      return {
        ...data,
        delta_type: data.delta_type as 'Email' | 'Meeting',
        module_states: data.module_states as unknown as ModuleStates,
        module_order: data.module_order as string[] | null,
        module_selections: data.module_selections as Record<string, any> | null,
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
    }) => {
      const { data, error } = await supabase
        .from('contact_email_builder_settings')
        .upsert([{
          contact_id: payload.contactId,
          module_states: payload.moduleStates as any,
          delta_type: payload.deltaType,
          selected_article_id: payload.selectedArticleId || null,
          module_order: payload.moduleOrder || null,
          module_selections: payload.moduleSelections || null,
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
