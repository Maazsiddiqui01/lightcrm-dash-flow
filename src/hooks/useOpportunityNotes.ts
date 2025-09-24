import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    mutationFn: async ({ opportunityId, content, dueDate }: { opportunityId: string; content: string; dueDate?: string }) => {
      const { error } = await supabase.rpc('add_opportunity_note', {
        p_opportunity_id: opportunityId,
        p_field: 'next_steps',
        p_content: content,
        p_due_date: dueDate || null,
      });

      if (error) throw error;
      
      return { content, dueDate };
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
      const { error } = await supabase.rpc('add_opportunity_note', {
        p_opportunity_id: opportunityId,
        p_field: 'most_recent_notes',
        p_content: content,
      });

      if (error) throw error;
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
    onError: (error) => {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes",
        variant: "destructive",
      });
    },
  });

  return {
    currentNotes: currentNotesQuery.data,
    timeline: timelineQuery.data || [],
    isLoadingCurrent: currentNotesQuery.isLoading,
    isLoadingTimeline: timelineQuery.isLoading,
    saveNextSteps: (content: string, dueDate?: string) => {
      if (!opportunityId) return;
      saveNextStepsMutation.mutate({ opportunityId, content, dueDate });
    },
    saveMostRecentNotes: (content: string) => {
      if (!opportunityId) return;
      saveMostRecentNotesMutation.mutate({ opportunityId, content });
    },
    isSavingNextSteps: saveNextStepsMutation.isPending,
    isSavingNotes: saveMostRecentNotesMutation.isPending,
  };
}