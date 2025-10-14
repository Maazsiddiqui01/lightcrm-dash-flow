import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ContactPhrasePreference, TriState } from '@/types/phraseLibrary';

export function useContactPhrasePreferences(contactId: string | null, moduleKey: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all phrase preferences for this contact + module
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['contact-phrase-preferences', contactId, moduleKey],
    queryFn: async (): Promise<ContactPhrasePreference[]> => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('contact_phrase_preferences')
        .select('*')
        .eq('contact_id', contactId)
        .eq('module_key', moduleKey);
      
      if (error) throw error;
      return data as ContactPhrasePreference[];
    },
    enabled: !!contactId && !!moduleKey,
  });

  // Save/update a phrase preference
  const savePrefMutation = useMutation({
    mutationFn: async ({ phraseId, triState }: { phraseId: string; triState: TriState }) => {
      if (!contactId) throw new Error('No contact ID');
      
      console.log('[PHRASE_PREF_DEBUG] Saving phrase preference:', {
        contactId,
        moduleKey,
        phraseId,
        triState,
        timestamp: new Date().toISOString(),
      });
      
      const { data, error } = await supabase
        .from('contact_phrase_preferences')
        .upsert({
          contact_id: contactId,
          module_key: moduleKey,
          phrase_id: phraseId,
          tri_state: triState,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'contact_id,module_key,phrase_id'
        })
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('[PHRASE_PREF_DEBUG] Save failed:', { contactId, moduleKey, phraseId, error });
        throw error;
      }
      
      console.log('[PHRASE_PREF_DEBUG] Preference saved successfully:', {
        contactId,
        moduleKey,
        phraseId,
        result: data,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['contact-phrase-preferences', contactId, moduleKey] 
      });
      console.log('[PHRASE_PREF_DEBUG] Query cache invalidated for:', { contactId, moduleKey });
    },
    onError: (error: any) => {
      console.error('[PHRASE_PREF_DEBUG] Mutation error:', { contactId, moduleKey, error });
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save phrase preference",
        variant: "destructive",
      });
    },
  });

  // Bulk save multiple preferences (can also handle multiple contacts)
  const bulkSaveMutation = useMutation({
    mutationFn: async (
      preferences: Array<{ 
        contactId?: string; 
        phraseId: string; 
        triState: TriState 
      }>
    ) => {
      // If contactId is provided in preference, use it; otherwise use hook's contactId
      const records = preferences.map(pref => ({
        contact_id: pref.contactId || contactId,
        module_key: moduleKey,
        phrase_id: pref.phraseId,
        tri_state: pref.triState,
        updated_at: new Date().toISOString(),
      }));
      
      // Filter out any records without contactId
      const validRecords = records.filter(r => r.contact_id);
      
      if (validRecords.length === 0) throw new Error('No valid contact IDs');
      
      const { data, error } = await supabase
        .from('contact_phrase_preferences')
        .upsert(validRecords, {
          onConflict: 'contact_id,module_key,phrase_id'
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['contact-phrase-preferences', contactId, moduleKey] 
      });
      toast({
        title: "Preferences Saved",
        description: "Phrase preferences have been updated.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to bulk save phrase preferences:', { contactId, moduleKey, error });
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save phrase preferences",
        variant: "destructive",
      });
    },
  });

  // Helper to get tri-state for a specific phrase
  const getTriState = (phraseId: string): TriState | null => {
    const pref = preferences?.find(p => p.phrase_id === phraseId);
    const result = pref?.tri_state || null;
    
    console.log('[PHRASE_PREF_DEBUG] Getting tri-state:', {
      contactId,
      moduleKey,
      phraseId,
      foundPreference: !!pref,
      triState: result,
      totalPreferences: preferences?.length || 0,
    });
    
    return result;
  };

  return {
    preferences,
    isLoading,
    savePreference: savePrefMutation.mutate,
    isSaving: savePrefMutation.isPending,
    bulkSavePreferences: bulkSaveMutation.mutate,
    isBulkSaving: bulkSaveMutation.isPending,
    getTriState,
  };
}
