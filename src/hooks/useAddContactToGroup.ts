import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddContactToGroupParams {
  contactId: string;
  groupId: string;
  emailRole?: 'to' | 'cc' | 'bcc';
}

export function useAddContactToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, groupId, emailRole = 'to' }: AddContactToGroupParams) => {
      const { data, error } = await supabase.rpc('add_contact_to_group', {
        p_contact_id: contactId,
        p_group_id: groupId,
        p_email_role: emailRole
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Contact added to group');
      queryClient.invalidateQueries({ queryKey: ['contact-groups', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['group-members-new', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add contact to group: ${error.message}`);
    }
  });
}
