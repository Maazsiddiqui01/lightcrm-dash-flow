import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkContactParams {
  opportunityId: string;
  contactId: string;
  contactFullName: string;
  slot: 1 | 2;
}

interface UnlinkContactParams {
  opportunityId: string;
  slot: 1 | 2;
}

export function useLinkContactToOpportunity() {
  const queryClient = useQueryClient();

  const linkMutation = useMutation({
    mutationFn: async ({ opportunityId, contactId, contactFullName, slot }: LinkContactParams) => {
      const field = slot === 1 ? 'deal_source_contact_1_id' : 'deal_source_contact_2_id';
      const nameField = slot === 1 ? 'deal_source_individual_1' : 'deal_source_individual_2';

      const { error } = await supabase
        .from('opportunities_raw')
        .update({
          [field]: contactId,
          [nameField]: contactFullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', opportunityId);

      if (error) throw error;
      return { opportunityId, contactId, slot };
    },
    onSuccess: (_, variables) => {
      toast.success('Contact linked to opportunity');
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['contact-opps'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities-search'] });
      queryClient.invalidateQueries({ queryKey: ['all-opportunities-list'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to link contact: ${error.message}`);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async ({ opportunityId, slot }: UnlinkContactParams) => {
      const field = slot === 1 ? 'deal_source_contact_1_id' : 'deal_source_contact_2_id';
      const nameField = slot === 1 ? 'deal_source_individual_1' : 'deal_source_individual_2';

      const { error } = await supabase
        .from('opportunities_raw')
        .update({
          [field]: null,
          [nameField]: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', opportunityId);

      if (error) throw error;
      return { opportunityId, slot };
    },
    onSuccess: () => {
      toast.success('Contact unlinked from opportunity');
      queryClient.invalidateQueries({ queryKey: ['contact-opps'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities-search'] });
      queryClient.invalidateQueries({ queryKey: ['all-opportunities-list'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink contact: ${error.message}`);
    },
  });

  return {
    linkContact: linkMutation.mutate,
    unlinkContact: unlinkMutation.mutate,
    isLinking: linkMutation.isPending,
    isUnlinking: unlinkMutation.isPending,
  };
}
