import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addOpportunityNote } from '@/utils/rpcHelpers';

export interface OpportunityNote {
  id: string;
  opportunity_id: string;
  field: string;
  content: string;
  due_date: string | null;
  created_at: string;
  created_by: string | null;
}

export interface OpportunityCurrentNotes {
  id: string;
  next_steps: string | null;
  next_steps_due_date: string | null;
  most_recent_notes: string | null;
  updated_at: string;
}

export function useOpportunityNotes(opportunityId: string | undefined, opportunityName?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current notes from opportunities_raw
  const currentNotesQuery = useQuery({
    queryKey: ['opportunity-current-notes', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return null;
      
      const { data, error } = await supabase
        .from('opportunities_raw')
        .select('id, next_steps, next_steps_due_date, most_recent_notes, updated_at')
        .eq('id', opportunityId)
        .single();

      if (error) throw error;
      return data as OpportunityCurrentNotes;
    },
    enabled: !!opportunityId,
  });

  // Fetch timeline from opportunity_notes_timeline view
  const timelineQuery = useQuery({
    queryKey: ['opportunity-notes-timeline', opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      
      const { data, error } = await supabase
        .from('opportunity_notes_timeline')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OpportunityNote[];
    },
    enabled: !!opportunityId,
  });

  // Save next steps mutation
  const saveNextStepsMutation = useMutation({
    mutationFn: async ({ opportunityId, content, dueDate, addInToDo }: { opportunityId: string; content: string; dueDate?: string; addInToDo?: boolean }) => {
      console.log('[useOpportunityNotes] Attempting to save next steps:', { opportunityId, content, dueDate, addInToDo });
      const { data, error } = await addOpportunityNote({
        opportunityId,
        field: 'next_steps',
        content,
        dueDate: dueDate || null,
      });

      if (error) {
        console.error('[useOpportunityNotes] RPC Error for next steps:', error);
        console.error('[useOpportunityNotes] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }
      
      console.log('[useOpportunityNotes] Successfully saved next steps, response:', data);
      return { content, dueDate, addInToDo };
    },
    onSuccess: async (data) => {
      toast({
        title: "Success",
        description: "Next steps saved successfully",
      });
      
      // Sync with Microsoft To Do via n8n webhook
      if (opportunityName && data.content) {
        try {
          await fetch('https://inverisllc.app.n8n.cloud/webhook/Get-To-do', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              opportunityName: opportunityName,
              nextSteps: data.content,
              dueDate: data.dueDate || null,
              addInToDo: data.addInToDo !== undefined ? data.addInToDo : true,
            }),
          });
        } catch (error) {
          console.error('Failed to sync with Microsoft To Do:', error);
          // Don't show error to user as the main save was successful
        }
      }
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['opportunity-current-notes', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-notes-timeline', opportunityId] });
    },
    onError: (error) => {
      console.error('Error saving next steps:', error);
      toast({
        title: "Error",
        description: "Failed to save next steps",
        variant: "destructive",
      });
    },
  });

  // Save most recent notes mutation
  const saveMostRecentNotesMutation = useMutation({
    mutationFn: async ({ opportunityId, content }: { opportunityId: string; content: string }) => {
      console.log('[useOpportunityNotes] Attempting to save most recent notes:', { opportunityId, content });
      const { data, error } = await addOpportunityNote({
        opportunityId,
        field: 'most_recent_notes',
        content,
        dueDate: null,
      });

      if (error) {
        console.error('[useOpportunityNotes] RPC Error:', error);
        console.error('[useOpportunityNotes] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }
      
      console.log('[useOpportunityNotes] Successfully saved, response:', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notes saved successfully",
      });
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['opportunity-current-notes', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-notes-timeline', opportunityId] });
    },
    onError: (error: any) => {
      console.error('[useOpportunityNotes] Mutation error:', error);
      const errorMessage = error?.message || error?.details || 'Failed to save notes';
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
        .from('opportunity_note_events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['opportunity-notes-timeline', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-current-notes', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (error: any) => {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  return {
    currentNotes: currentNotesQuery.data,
    timeline: timelineQuery.data || [],
    isLoadingCurrent: currentNotesQuery.isLoading,
    isLoadingTimeline: timelineQuery.isLoading,
    saveNextSteps: (content: string, dueDate?: string, addInToDo?: boolean) => {
      if (!opportunityId) return;
      saveNextStepsMutation.mutate({ opportunityId, content, dueDate, addInToDo });
    },
    saveMostRecentNotes: (content: string) => {
      if (!opportunityId) return;
      saveMostRecentNotesMutation.mutate({ opportunityId, content });
    },
    isSavingNextSteps: saveNextStepsMutation.isPending,
    isSavingNotes: saveMostRecentNotesMutation.isPending,
    deleteNote: (eventId: string) => {
      deleteNoteMutation.mutate({ eventId });
    },
    isDeletingNote: deleteNoteMutation.isPending,
  };
}