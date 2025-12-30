import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  GroupSuggestion, 
  SaveGroupSuggestionInput, 
  UpdateSuggestionStatusInput,
  SuggestionMode,
  SuggestionStatus
} from '@/types/groupSuggestion';

/**
 * Fetch persisted group suggestions from database
 */
export function useGroupSuggestions(mode?: SuggestionMode, statusFilter?: SuggestionStatus | 'all') {
  return useQuery({
    queryKey: ['group-suggestions', mode, statusFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('group_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (mode) {
        query = query.eq('mode', mode);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as unknown as GroupSuggestion[];
    },
    enabled: true,
  });
}

/**
 * Save or update a group suggestion
 */
export function useSaveGroupSuggestion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SaveGroupSuggestionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('group_suggestions')
        .upsert({
          suggestion_id: input.suggestion_id,
          user_id: user.id,
          mode: input.mode,
          suggested_name: input.suggested_name,
          members: input.members as any,
          metadata: input.metadata || {},
          status: input.status || 'pending',
        }, {
          onConflict: 'user_id,suggestion_id,mode',
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as GroupSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['group-suggestion-counts'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving suggestion',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk save multiple group suggestions
 */
export function useBulkSaveGroupSuggestions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inputs: SaveGroupSuggestionInput[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const records = inputs.map(input => ({
        suggestion_id: input.suggestion_id,
        user_id: user.id,
        mode: input.mode,
        suggested_name: input.suggested_name,
        members: input.members as any,
        metadata: input.metadata || {},
        status: input.status || 'pending',
      }));

      const { data, error } = await supabase
        .from('group_suggestions')
        .upsert(records, {
          onConflict: 'user_id,suggestion_id,mode',
        })
        .select();

      if (error) throw error;
      return data as unknown as GroupSuggestion[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['group-suggestion-counts'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving suggestions',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update suggestion status (pending → approved/dismissed)
 */
export function useUpdateSuggestionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateSuggestionStatusInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates: any = {
        status: input.status,
      };

      if (input.status === 'dismissed') {
        updates.dismissed_at = new Date().toISOString();
      } else if (input.status === 'approved') {
        updates.approved_at = new Date().toISOString();
        if (input.groupId) {
          updates.group_id = input.groupId;
        }
      } else if (input.status === 'pending') {
        updates.dismissed_at = null;
        updates.approved_at = null;
      }

      const { data, error } = await supabase
        .from('group_suggestions')
        .update(updates)
        .eq('suggestion_id', input.suggestionId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as GroupSuggestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['group-suggestion-counts'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating suggestion status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
