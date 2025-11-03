import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContactNextStep {
  id: string;
  contact_id: string;
  field: string;
  content: string;
  due_date: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
}

export interface ContactCurrentNextSteps {
  id: string;
  next_steps: string | null;
  next_steps_due_date: string | null;
  updated_at: string;
}

export function useContactNextSteps(contactId: string | undefined, contactName?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current next steps from contacts_raw
  const currentNextStepsQuery = useQuery({
    queryKey: ['contact-current-next-steps', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from('contacts_raw')
        .select('id, next_steps, next_steps_due_date, updated_at')
        .eq('id', contactId)
        .single();

      if (error) throw error;
      return data as ContactCurrentNextSteps;
    },
    enabled: !!contactId,
  });

  // Fetch timeline from contact_next_steps_timeline view
  const timelineQuery = useQuery({
    queryKey: ['contact-next-steps-timeline', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('contact_next_steps_timeline')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactNextStep[];
    },
    enabled: !!contactId,
  });

  // Real-time sync for contact next steps changes
  useEffect(() => {
    if (!contactId) return;

    const channel = supabase
      .channel('contact-next-steps-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts_raw',
          filter: `id=eq.${contactId}`,
        },
        (payload) => {
          console.log('Contact next steps changed:', payload);
          queryClient.invalidateQueries({ 
            queryKey: ['contact-current-next-steps', contactId] 
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_note_events',
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          console.log('Contact next steps timeline updated:', payload);
          queryClient.invalidateQueries({ 
            queryKey: ['contact-next-steps-timeline', contactId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, queryClient]);

  // Save next steps mutation
  const saveNextStepsMutation = useMutation({
    mutationFn: async ({ 
      contactId, 
      content, 
      dueDate, 
      addInToDo 
    }: { 
      contactId: string; 
      content: string; 
      dueDate?: string; 
      addInToDo?: boolean 
    }) => {
      const { error } = await supabase.rpc('add_contact_note', {
        p_contact_id: contactId,
        p_field: 'next_steps',
        p_content: content,
        p_due_date: dueDate || null,
      });

      if (error) throw error;
      
      return { content, dueDate, addInToDo };
    },
    onSuccess: async (data) => {
      toast({
        title: "Success",
        description: "Next steps saved successfully",
      });
      
      // Sync with Microsoft To Do via n8n webhook if addInToDo is true
      if (contactName && data.content && data.addInToDo) {
        try {
          await fetch('https://inverisllc.app.n8n.cloud/webhook/Get-To-do', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contactName: contactName,
              nextSteps: data.content,
              dueDate: data.dueDate || null,
              addInToDo: data.addInToDo !== undefined ? data.addInToDo : true,
            }),
          });
        } catch (error) {
          console.error('Failed to sync with Microsoft To Do:', error);
        }
      }
      
      // Invalidate and refetch related queries
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ['contact-current-next-steps', contactId] });
        queryClient.invalidateQueries({ queryKey: ['contact-next-steps-timeline', contactId] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      }
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

  return {
    currentNextSteps: currentNextStepsQuery.data,
    timeline: timelineQuery.data || [],
    isLoadingCurrent: currentNextStepsQuery.isLoading,
    isLoadingTimeline: timelineQuery.isLoading,
    saveNextSteps: (content: string, dueDate?: string, addInToDo?: boolean) => {
      if (!contactId) return;
      saveNextStepsMutation.mutate({ contactId, content, dueDate, addInToDo });
    },
    isSaving: saveNextStepsMutation.isPending,
  };
}
