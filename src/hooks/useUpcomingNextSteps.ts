import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { addContactNote, addOpportunityNote } from '@/utils/rpcHelpers';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';

export interface UpcomingNextStep {
  id: string;
  entity_type: 'contact' | 'opportunity';
  entity_name: string;
  next_steps: string;
  due_date: string;
  is_overdue: boolean;
  days_until_due: number;
}

export function useUpcomingNextSteps(limit?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch upcoming next steps from both contacts and opportunities
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['upcoming-next-steps'],
    queryFn: async () => {
      const today = new Date();

      // Fetch contacts with next steps
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts_raw')
        .select('id, full_name, next_steps, next_steps_due_date')
        .not('next_steps_due_date', 'is', null)
        .not('next_steps', 'is', null)
        .neq('next_steps', '')
        .order('next_steps_due_date', { ascending: true });

      if (contactsError) throw contactsError;

      // Fetch opportunities with next steps
      const { data: opportunities, error: oppsError } = await supabase
        .from('opportunities_raw')
        .select('id, deal_name, next_steps, next_steps_due_date')
        .not('next_steps_due_date', 'is', null)
        .not('next_steps', 'is', null)
        .neq('next_steps', '')
        .order('next_steps_due_date', { ascending: true });

      if (oppsError) throw oppsError;

      // Combine and map to UpcomingNextStep interface
      const contactSteps: UpcomingNextStep[] = (contacts || []).map(c => {
        const dueDate = new Date(c.next_steps_due_date!);
        const daysUntil = differenceInDays(dueDate, today);
        
        return {
          id: c.id,
          entity_type: 'contact' as const,
          entity_name: c.full_name || 'Unnamed Contact',
          next_steps: c.next_steps!,
          due_date: c.next_steps_due_date!,
          is_overdue: daysUntil < 0,
          days_until_due: daysUntil,
        };
      });

      const opportunitySteps: UpcomingNextStep[] = (opportunities || []).map(o => {
        const dueDate = new Date(o.next_steps_due_date!);
        const daysUntil = differenceInDays(dueDate, today);
        
        return {
          id: o.id,
          entity_type: 'opportunity' as const,
          entity_name: o.deal_name || 'Unnamed Opportunity',
          next_steps: o.next_steps!,
          due_date: o.next_steps_due_date!,
          is_overdue: daysUntil < 0,
          days_until_due: daysUntil,
        };
      });

      // Combine and sort by due date
      const allSteps = [...contactSteps, ...opportunitySteps].sort((a, b) => {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      // Apply limit if specified
      return limit ? allSteps.slice(0, limit) : allSteps;
    },
  });

  // Real-time subscription for contacts
  useEffect(() => {
    const contactsChannel = supabase
      .channel('contacts-next-steps-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts_raw',
          filter: 'next_steps_due_date=not.is.null',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    const oppsChannel = supabase
      .channel('opportunities-next-steps-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'opportunities_raw',
          filter: 'next_steps_due_date=not.is.null',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(oppsChannel);
    };
  }, [refetch]);

  // Mark as complete mutation
  const markAsCompleteMutation = useMutation({
    mutationFn: async (step: UpcomingNextStep) => {
      // Archive current next step to timeline
      if (step.entity_type === 'contact') {
        await addContactNote({
          contactId: step.id,
          field: 'next_steps',
          content: `[COMPLETED] ${step.next_steps}`,
          dueDate: null,
        });

        // Clear current next steps
        const { error } = await supabase
          .from('contacts_raw')
          .update({ next_steps: null, next_steps_due_date: null })
          .eq('id', step.id);

        if (error) throw error;
      } else {
        await addOpportunityNote({
          opportunityId: step.id,
          field: 'next_steps',
          content: `[COMPLETED] ${step.next_steps}`,
          dueDate: null,
        });

        // Clear current next steps
        const { error } = await supabase
          .from('opportunities_raw')
          .update({ next_steps: null, next_steps_due_date: null })
          .eq('id', step.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Next Step Completed",
        description: "The next step has been marked as complete and archived.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark as complete",
        variant: "destructive",
      });
    },
  });

  return {
    data: data || [],
    isLoading,
    markAsComplete: markAsCompleteMutation.mutate,
    isMarkingComplete: markAsCompleteMutation.isPending,
    refresh: refetch,
  };
}
