import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addHorizonNote } from '@/utils/rpcHelpers';
import { callN8nProxy } from '@/lib/n8nProxy';

export interface HorizonNote {
  id: string;
  record_id: string;
  record_type: 'company' | 'gp';
  field: 'notes' | 'next_steps';
  content: string;
  due_date: string | null;
  created_at: string;
  created_by: string | null;
}

export interface HorizonCurrentNotes {
  id: string;
  notes: string | null;
  next_steps: string | null;
  next_steps_due_date: string | null;
  updated_at: string;
}

export function useHorizonNotes(
  recordId: string | undefined,
  recordType: 'company' | 'gp',
  recordName?: string
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tableName = recordType === 'company' ? 'lg_horizons_companies' : 'lg_horizons_gps';

  const currentNotesQuery = useQuery({
    queryKey: ['horizon-current-notes', recordId, recordType],
    queryFn: async () => {
      if (!recordId) return null;
      const { data, error } = await supabase
        .from(tableName)
        .select('id, notes, next_steps, next_steps_due_date, updated_at')
        .eq('id', recordId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data as HorizonCurrentNotes;
    },
    enabled: !!recordId,
  });

  const timelineQuery = useQuery({
    queryKey: ['horizon-notes-timeline', recordId, recordType],
    queryFn: async () => {
      if (!recordId) return [];
      const { data, error } = await supabase
        .from('horizon_notes_timeline')
        .select('*')
        .eq('record_id', recordId)
        .eq('record_type', recordType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HorizonNote[];
    },
    enabled: !!recordId,
  });

  const saveNotesMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      if (!recordId) throw new Error('Record ID is required');
      console.log('[useHorizonNotes] Saving notes:', { recordId, recordType, content });
      const { error } = await addHorizonNote({ recordId, recordType, field: 'notes', content, dueDate: null });
      if (error) { console.error('[useHorizonNotes] RPC Error:', error); throw error; }
      console.log('[useHorizonNotes] Successfully saved notes');
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Notes saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['horizon-current-notes', recordId, recordType] });
      queryClient.invalidateQueries({ queryKey: ['horizon-notes-timeline', recordId, recordType] });
      queryClient.invalidateQueries({ queryKey: ['horizon-companies'] });
      queryClient.invalidateQueries({ queryKey: ['horizon-gps'] });
    },
    onError: (error: any) => {
      console.error('[useHorizonNotes] Mutation error:', error);
      toast({ title: "Error", description: error?.message || "Failed to save notes", variant: "destructive" });
    },
  });

  const saveNextStepsMutation = useMutation({
    mutationFn: async ({ content, dueDate, addInToDo }: { content: string; dueDate?: string; addInToDo?: boolean }) => {
      if (!recordId) throw new Error('Record ID is required');
      console.log('[useHorizonNotes] Saving next steps:', { recordId, recordType, content, dueDate, addInToDo });
      const { error } = await addHorizonNote({ recordId, recordType, field: 'next_steps', content, dueDate: dueDate || null });
      if (error) { console.error('[useHorizonNotes] RPC Error:', error); throw error; }
      console.log('[useHorizonNotes] Successfully saved next steps');
      return { content, dueDate, addInToDo };
    },
    onSuccess: async (data) => {
      toast({ title: "Success", description: "Next steps saved successfully" });
      
      // Sync with Microsoft To Do via n8n proxy if addInToDo is true
      if (recordName && data.content && data.addInToDo) {
        try {
          await callN8nProxy('todo', {
            opportunityName: `[Horizon ${recordType === 'company' ? 'Company' : 'GP'}] ${recordName}`,
            nextSteps: data.content,
            dueDate: data.dueDate || null,
            addInToDo: true,
          });
        } catch (error) {
          console.error('Failed to sync with Microsoft To Do:', error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['horizon-current-notes', recordId, recordType] });
      queryClient.invalidateQueries({ queryKey: ['horizon-notes-timeline', recordId, recordType] });
      queryClient.invalidateQueries({ queryKey: ['horizon-companies'] });
      queryClient.invalidateQueries({ queryKey: ['horizon-gps'] });
    },
    onError: (error: any) => {
      console.error('[useHorizonNotes] Mutation error:', error);
      toast({ title: "Error", description: error?.message || "Failed to save next steps", variant: "destructive" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      const { error } = await supabase.from('horizon_note_events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Entry deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['horizon-notes-timeline', recordId, recordType] });
      queryClient.invalidateQueries({ queryKey: ['horizon-current-notes', recordId, recordType] });
      queryClient.invalidateQueries({ queryKey: ['horizon-companies'] });
      queryClient.invalidateQueries({ queryKey: ['horizon-gps'] });
    },
    onError: (error: any) => {
      console.error('Error deleting note:', error);
      toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" });
    },
  });

  return {
    currentNotes: currentNotesQuery.data,
    timeline: timelineQuery.data || [],
    isLoadingCurrent: currentNotesQuery.isLoading,
    isLoadingTimeline: timelineQuery.isLoading,
    saveNotes: (content: string) => { if (!recordId) return; saveNotesMutation.mutate({ content }); },
    saveNextSteps: (content: string, dueDate?: string, addInToDo?: boolean) => { if (!recordId) return; saveNextStepsMutation.mutate({ content, dueDate, addInToDo }); },
    isSavingNotes: saveNotesMutation.isPending,
    isSavingNextSteps: saveNextStepsMutation.isPending,
    deleteNote: (eventId: string) => { deleteNoteMutation.mutate({ eventId }); },
    isDeletingNote: deleteNoteMutation.isPending,
  };
}
