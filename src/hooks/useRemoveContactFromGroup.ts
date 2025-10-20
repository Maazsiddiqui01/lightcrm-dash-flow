import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RemoveContactFromGroupParams {
  contactId: string;
  groupId: string;
}

export function useRemoveContactFromGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, groupId }: RemoveContactFromGroupParams) => {
      const { data, error } = await supabase.rpc('remove_contact_from_group', {
        p_contact_id: contactId,
        p_group_id: groupId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Contact removed from group');
      queryClient.invalidateQueries({ queryKey: ['contact-groups', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-new', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove contact from group: ${error.message}`);
    }
  });
}
