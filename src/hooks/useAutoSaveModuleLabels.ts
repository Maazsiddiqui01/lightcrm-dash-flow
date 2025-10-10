import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to auto-save custom module labels globally to template settings
 * Saves immediately without requiring manual save button click
 */
export function useAutoSaveModuleLabels(templateId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customLabels: Record<string, string>) => {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('email_template_settings')
        .upsert(
          {
            template_id: templateId,
            custom_module_labels: customLabels,
            updated_by: user?.id,
            updated_at: new Date().toISOString(),
          },
          { 
            onConflict: 'template_id',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate template settings to refresh
      queryClient.invalidateQueries({ queryKey: ['new-template-settings', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-settings', templateId] });
      
      toast({
        title: 'Module label saved',
        description: 'Custom label applied globally for all contacts',
        duration: 2000,
      });
    },
    onError: (error: any) => {
      console.error('Error auto-saving module label:', error);
      toast({
        title: 'Failed to save label',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
