import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpdateMemberRoleParams {
  contactId: string;
  groupId: string;
  emailRole: 'to' | 'cc' | 'bcc' | null;
}

export function useUpdateMemberRole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, groupId, emailRole }: UpdateMemberRoleParams) => {
      const { data, error } = await supabase
        .from('contact_group_memberships')
        .update({ email_role: emailRole })
        .eq('contact_id', contactId)
        .eq('group_id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
      queryClient.invalidateQueries({ queryKey: ['group-members-new'] });
      queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
    },
    onError: (error) => {
      console.error('Error updating member role:', error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
    },
  });
}
