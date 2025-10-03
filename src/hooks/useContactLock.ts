import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContactLockStatus {
  locked: boolean;
  locked_by?: string;
  locked_until?: string;
  lock_reason?: string;
}

export function useContactLock(contactId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lockStatus, isLoading } = useQuery({
    queryKey: ['contact-lock', contactId],
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await supabase
        .from('contacts_raw')
        .select('locked_by, locked_until, lock_reason')
        .eq('id', contactId)
        .single();

      if (error) throw error;

      return {
        locked: data.locked_by !== null && new Date(data.locked_until) > new Date(),
        locked_by: data.locked_by,
        locked_until: data.locked_until,
        lock_reason: data.lock_reason,
      } as ContactLockStatus;
    },
    enabled: !!contactId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const lockContact = useMutation({
    mutationFn: async ({
      contactId,
      durationMinutes = 30,
      reason = 'Composing email',
    }: {
      contactId: string;
      durationMinutes?: number;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('lock_contact', {
        p_contact_id: contactId,
        p_duration_minutes: durationMinutes,
        p_reason: reason,
      });

      if (error) throw error;
      return data as {
        success: boolean;
        locked: boolean;
        locked_by?: string;
        locked_until?: string;
        lock_reason?: string;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-lock', contactId] });
      
      if (!data.success && data.locked_until) {
        toast({
          title: 'Contact in use',
          description: `This contact is currently locked by another user until ${new Date(data.locked_until).toLocaleTimeString()}.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to lock contact: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const unlockContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { data, error } = await supabase.rpc('unlock_contact', {
        p_contact_id: contactId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lock', contactId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to unlock contact: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    lockStatus,
    isLoading,
    lockContact: lockContact.mutate,
    unlockContact: unlockContact.mutate,
    isLocking: lockContact.isPending,
    isUnlocking: unlockContact.isPending,
  };
}
