import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addContactNote } from '@/utils/rpcHelpers';

interface ContactNote {
  id?: string;
  contact_id: string;
  field: string;
  content: string;
  created_at: string;
  created_by: string | null;
}

interface ContactCurrentNotes {
  notes: string | null;
  updated_at: string | null;
}

export const useContactNotes = (contactId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current contact notes
  const currentNotesQuery = useQuery({
    queryKey: ['contact-notes', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from('contacts_raw')
        .select('notes, updated_at')
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      return data as ContactCurrentNotes;
    },
    enabled: !!contactId,
  });

  // Fetch contact notes timeline
  const timelineQuery = useQuery({
    queryKey: ['contact-notes-timeline', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('contact_notes_timeline')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ContactNote[];
    },
    enabled: !!contactId,
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async ({ contactId, content }: { contactId: string; content: string }) => {
      const { error } = await addContactNote({
        contactId,
        field: 'notes',
        content,
        dueDate: null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notes saved successfully",
      });
      
      // Invalidate both queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['contact-notes', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact-notes-timeline', contactId] });
    },
    onError: (error: any) => {
      console.error('Error saving notes:', error);
      const errorMessage = error?.message || error?.error_description || 'Failed to save notes';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      const { error } = await supabase
        .from('contact_note_events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['contact-notes-timeline', contactId] });
    },
    onError: (error: any) => {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  return {
    currentNotes: currentNotesQuery.data,
    timeline: timelineQuery.data || [],
    isLoadingCurrent: currentNotesQuery.isLoading,
    isLoadingTimeline: timelineQuery.isLoading,
    saveNotes: (content: string) => {
      if (!contactId) return;
      saveNotesMutation.mutate({ contactId, content });
    },
    isSavingNotes: saveNotesMutation.isPending,
    deleteNote: (eventId: string) => {
      deleteNoteMutation.mutate({ eventId });
    },
    isDeletingNote: deleteNoteMutation.isPending,
  };
};