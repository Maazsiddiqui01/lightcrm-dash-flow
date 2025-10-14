import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TriState } from '@/types/phraseLibrary';

export interface ContactSubjectPreference {
  id: string;
  contact_id: string;
  module_key: string;
  subject_id: string;
  tri_state: TriState;
  created_at: string;
  updated_at: string;
}

export function useContactSubjectPreferences(contactId: string | null, moduleKey: string = 'subject_line') {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all subject preferences for this contact + module
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['contact-subject-preferences', contactId, moduleKey],
    queryFn: async (): Promise<ContactSubjectPreference[]> => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('contact_subject_preferences')
        .select('*')
        .eq('contact_id', contactId)
        .eq('module_key', moduleKey);
      
      if (error) throw error;
      return data as ContactSubjectPreference[];
    },
    enabled: !!contactId && !!moduleKey,
  });

  // Save/update a subject preference
  const savePrefMutation = useMutation({
    mutationFn: async ({ subjectId, triState }: { subjectId: string; triState: TriState }) => {
      if (!contactId) throw new Error('No contact ID');
      
      const { data, error } = await supabase
        .from('contact_subject_preferences')
        .upsert({
          contact_id: contactId,
          module_key: moduleKey,
          subject_id: subjectId,
          tri_state: triState,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'contact_id,module_key,subject_id'
        })
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['contact-subject-preferences', contactId, moduleKey] 
      });
    },
    onError: (error: any) => {
      console.error('Failed to save subject preference:', { contactId, moduleKey, error });
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save subject preference",
        variant: "destructive",
      });
    },
  });

  // Bulk save multiple preferences
  const bulkSaveMutation = useMutation({
    mutationFn: async (preferences: Array<{ subjectId: string; triState: TriState }>) => {
      if (!contactId) throw new Error('No contact ID');
      
      const records = preferences.map(pref => ({
        contact_id: contactId,
        module_key: moduleKey,
        subject_id: pref.subjectId,
        tri_state: pref.triState,
        updated_at: new Date().toISOString(),
      }));
      
      const { data, error } = await supabase
        .from('contact_subject_preferences')
        .upsert(records, {
          onConflict: 'contact_id,module_key,subject_id'
        })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['contact-subject-preferences', contactId, moduleKey] 
      });
      toast({
        title: "Preferences Saved",
        description: "Subject preferences have been updated.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to bulk save subject preferences:', { contactId, moduleKey, error });
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save subject preferences",
        variant: "destructive",
      });
    },
  });

  // Helper to get tri-state for a specific subject
  const getTriState = (subjectId: string): TriState | null => {
    const pref = preferences?.find(p => p.subject_id === subjectId);
    return pref?.tri_state || null;
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
