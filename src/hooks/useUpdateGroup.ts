import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSafeUpdate, validateUpdate } from '@/utils/databaseUpdateHelpers';

interface UpdateGroupParams {
  groupId: string;
  updates: {
    max_lag_days?: number | null;
    focus_area?: string | null;
    sector?: string | null;
    notes?: string | null;
  };
}

export function useUpdateGroup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, updates }: UpdateGroupParams) => {
      // Add updated_at timestamp
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      // Apply safe field whitelisting for groups table
      const safeUpdate = getSafeUpdate('groups', updatesWithTimestamp);
      const validation = validateUpdate('groups', safeUpdate);
      
      if (!validation.valid) {
        console.warn('[Validation] Invalid fields for groups table:', validation.violations);
        throw new Error(`Cannot update forbidden fields: ${validation.violations.join(', ')}`);
      }
      
      const { data, error } = await supabase
        .from('groups')
        .update(safeUpdate)
        .eq('id', groupId)
        .select()
        .single();

      if (error) {
        console.error('[DB Error]', {
          operation: 'update_group',
          table: 'groups',
          error,
          groupId,
        });
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group updated successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      console.error('Error updating group:', error);
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive",
      });
    },
  });
}
