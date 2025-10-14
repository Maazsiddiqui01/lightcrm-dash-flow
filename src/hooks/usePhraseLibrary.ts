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
    mutationFn: async (phrase: Omit<PhraseLibraryItem, 'id' | 'created_at' | 'updated_at'> & { style?: 'formal' | 'hybrid' | 'casual' | null }) => {
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
    mutationFn: async ({ 
      id, 
      updates, 
      applyToAll,
      updateTriStateDefaults 
    }: { 
      id: string; 
      updates: Partial<PhraseLibraryItem>;
      applyToAll?: boolean;
      updateTriStateDefaults?: boolean;
    }) => {
      if (applyToAll) {
        // Get the original phrase to find all related phrases
        const { data: original, error: fetchError } = await supabase
          .from('phrase_library' as any)
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        
        if (original && (original as any).phrase_text) {
          // Update all phrases with same text/category
          const { error } = await supabase
            .from('phrase_library' as any)
            .update(updates as any)
            .eq('phrase_text', (original as any).phrase_text)
            .eq('category', (original as any).category);

          if (error) throw error;
        }
      } else {
        // Update single phrase
        const { data, error } = await supabase
          .from('phrase_library' as any)
          .update(updates as any)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate all phrase library queries
      queryClient.invalidateQueries({ queryKey: ['phrase-library'] });
      // Also invalidate email builder related queries
      queryClient.invalidateQueries({ queryKey: ['email-builder'] });
      queryClient.invalidateQueries({ queryKey: ['composer'] });
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

/**
 * Get available phrases with rotation tracking
 * Returns phrases from a category that haven't been used recently for this contact
 */
export async function getAvailablePhrases(
  contactId: string,
  category: PhraseCategory,
  allPhrases: PhraseLibraryItem[]
): Promise<PhraseLibraryItem[]> {
  const { data: usedLogs } = await supabase
    .from('phrase_rotation_log' as any)
    .select('phrase_id')
    .eq('contact_id', contactId)
    .order('used_at', { ascending: false })
    .limit(20); // Track last 20 used phrases
  
  const usedIds = new Set(usedLogs?.map((log: any) => log.phrase_id) || []);
  
  // Filter to category and exclude used
  const categoryPhrases = allPhrases.filter(p => p.category === category);
  let available = categoryPhrases.filter(p => !usedIds.has(p.id));
  
  // If all used, reset rotation for this category
  if (available.length === 0 && categoryPhrases.length > 0) {
    const categoryPhraseIds = categoryPhrases.map(p => p.id);
    await supabase
      .from('phrase_rotation_log' as any)
      .delete()
      .eq('contact_id', contactId)
      .in('phrase_id', categoryPhraseIds);
    
    available = categoryPhrases;
  }
  
  return available;
}

/**
 * Pick a random phrase from available phrases with rotation tracking
 */
export async function pickPhrase(
  contactId: string,
  category: PhraseCategory,
  allPhrases: PhraseLibraryItem[]
): Promise<PhraseLibraryItem | null> {
  const available = await getAvailablePhrases(contactId, category, allPhrases);
  
  if (available.length === 0) return null;
  
  const selected = available[Math.floor(Math.random() * available.length)];
  return selected;
}

/**
 * Log phrase usage for rotation tracking
 */
export async function logPhraseUsage(contactId: string, phraseId: string): Promise<void> {
  const { error } = await supabase
    .from('phrase_rotation_log' as any)
    .insert({
      contact_id: contactId,
      phrase_id: phraseId,
      used_at: new Date().toISOString()
    });
  
  if (error) {
    console.error('Failed to log phrase usage (non-blocking):', error);
  }
}
