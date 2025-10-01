import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PhraseLibraryItem, PhraseCategory, TriState } from '@/types/phraseLibrary';

export function usePhraseLibrary(templateId: string | null, category?: PhraseCategory) {
  return useQuery({
    queryKey: ['phrase-library', templateId, category],
    queryFn: async () => {
      let query = supabase
        .from('phrase_library' as any)
        .select('*')
        .order('created_at', { ascending: true });

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as PhraseLibraryItem[];
    },
    enabled: templateId !== null || category !== undefined,
  });
}

export function useGlobalPhrases(category?: PhraseCategory) {
  return useQuery({
    queryKey: ['phrase-library', 'global', category],
    queryFn: async () => {
      let query = supabase
        .from('phrase_library' as any)
        .select('*')
        .eq('is_global', true)
        .order('category', { ascending: true })
        .order('created_at', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as PhraseLibraryItem[];
    },
  });
}

export function useCreatePhrase() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phrase: Omit<PhraseLibraryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('phrase_library' as any)
        .insert(phrase as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phrase-library'] });
      toast({
        title: 'Phrase added',
        description: 'The phrase has been added to the library',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding phrase',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePhrase() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PhraseLibraryItem> }) => {
      const { data, error } = await supabase
        .from('phrase_library' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phrase-library'] });
      toast({
        title: 'Phrase updated',
        description: 'The phrase has been updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating phrase',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePhrase() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('phrase_library' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phrase-library'] });
      toast({
        title: 'Phrase deleted',
        description: 'The phrase has been removed from the library',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting phrase',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useBulkUpdatePhrases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phrases: Array<{ id: string; tri_state: TriState }>) => {
      const updates = phrases.map(p => 
        supabase
          .from('phrase_library' as any)
          .update({ tri_state: p.tri_state } as any)
          .eq('id', p.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phrase-library'] });
      toast({
        title: 'Phrases updated',
        description: 'Phrase settings have been updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating phrases',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
