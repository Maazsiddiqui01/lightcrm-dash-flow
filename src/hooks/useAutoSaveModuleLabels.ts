import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { saveWithOCC } from '@/lib/optimisticConcurrency';

/**
 * Hook to auto-save custom module labels globally to template settings
 * Saves immediately without requiring manual save button click
 * Now includes OCC to prevent concurrent edit conflicts
 */
export function useAutoSaveModuleLabels(templateId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      customLabels, 
      currentRevision 
    }: { 
      customLabels: Record<string, string>; 
      currentRevision?: number 
    }) => {
      if (!templateId) {
        throw new Error('Template ID is required');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Use OCC to handle concurrent edits
      const result = await saveWithOCC(
        'email_template_settings',
        templateId,
        {
          template_id: templateId,
          custom_module_labels: customLabels,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
          revision: currentRevision,
        },
        {
          idColumn: 'template_id',
          onConflict: async (conflicts) => {
            // Auto-merge for label changes - last write wins
            console.warn('Concurrent label edit detected, overwriting with latest');
            return { action: 'overwrite' };
          },
        }
      );

      if (!result.success) {
        throw new Error('Failed to save module labels due to conflict');
      }

      return result.data;
    },
    onSuccess: () => {
      // Invalidate template settings to refresh
      queryClient.invalidateQueries({ queryKey: ['new-template-settings', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-settings', templateId] });
      
      toast({
        title: 'Module name saved',
        description: 'Preserved across all contacts and sessions',
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
