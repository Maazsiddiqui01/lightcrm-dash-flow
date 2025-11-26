import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addContactNote } from '@/utils/rpcHelpers';

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
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
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
      const { error } = await addContactNote({
        contactId,
        field: 'next_steps',
        content,
        dueDate: dueDate || null,
      });

      if (error) throw error;
      
      // Fetch enriched contact data for webhook
      const { data: contactData } = await supabase
        .from('contacts_raw')
        .select('email_address, organization, full_name')
        .eq('id', contactId)
        .maybeSingle();
      
      // Fetch opportunities for this contact
      let opportunities: string[] = [];
      if (contactData?.full_name) {
        const { data: oppsData } = await supabase
          .from('opportunities_raw')
          .select('deal_name')
          .or(`deal_source_individual_1.ilike.%${contactData.full_name}%,deal_source_individual_2.ilike.%${contactData.full_name}%`)
          .limit(10);
        
        if (oppsData) {
          opportunities = oppsData
            .map(o => o.deal_name)
            .filter((name): name is string => !!name);
        }
      }
      
      return { 
        content, 
        dueDate, 
        addInToDo, 
        email: contactData?.email_address,
        organization: contactData?.organization,
        opportunities 
      };
    },
    onSuccess: async (data) => {
      toast({
        title: "Success",
        description: "Next steps saved successfully",
      });
      
      // Sync with Microsoft To Do via n8n webhook if addInToDo is true
      if (contactName && data.content && data.addInToDo) {
        try {
          const response = await fetch('https://inverisllc.app.n8n.cloud/webhook/Get-To-do-Contacts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contactId: contactId,
              contactName: contactName,
              email: data.email,
              organization: data.organization,
              opportunities: data.opportunities,
              nextSteps: data.content,
              dueDate: data.dueDate || null,
              addInToDo: data.addInToDo !== undefined ? data.addInToDo : true,
            }),
          });
          
          if (!response.ok) {
            console.error('Failed to sync with Microsoft To Do:', await response.text());
          }
        } catch (error) {
          console.error('Failed to sync with Microsoft To Do:', error);
        }
      }
      
      // Invalidate and refetch related queries with aggressive refetching
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ['contact-current-next-steps', contactId] });
        queryClient.invalidateQueries({ queryKey: ['contact-next-steps-timeline', contactId] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['contacts-with-opportunities'] });
        queryClient.invalidateQueries({ queryKey: ['contact-detail', contactId] });
        // Force immediate refetch of main contacts query
        queryClient.refetchQueries({ queryKey: ['contacts'] });
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

  // Delete next step mutation
  const deleteNextStepMutation = useMutation({
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
        description: "Next step deleted successfully",
      });
      
      // Invalidate queries to refresh data
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ['contact-next-steps-timeline', contactId] });
        queryClient.invalidateQueries({ queryKey: ['contact-current-next-steps', contactId] });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      }
    },
    onError: (error: any) => {
      console.error('Error deleting next step:', error);
      toast({
        title: "Error",
        description: "Failed to delete next step",
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
    deleteNextStep: (eventId: string) => {
      deleteNextStepMutation.mutate({ eventId });
    },
    isDeleting: deleteNextStepMutation.isPending,
  };
}
