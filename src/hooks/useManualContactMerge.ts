import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { edgeInvoke } from '@/lib/edgeInvoke';

interface MergeContactsParams {
  contactIds: string[];
  primaryId: string;
}

export function useManualContactMerge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ contactIds, primaryId }: MergeContactsParams) => {
      // Create a unique group ID for this manual merge
      const groupId = `manual-merge-${Date.now()}`;
      
      const result = await edgeInvoke('data_normalization', {
        action: 'merge_contacts',
        groupId,
        primaryId,
        contactIds
      });

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-with-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-email-counts'] });
      
      toast({
        title: 'Contacts merged successfully',
        description: `${data.mergedCount || 'Multiple'} contacts have been merged into one.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Merge failed',
        description: error.message || 'Failed to merge contacts. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    mergeContacts: mutation.mutate,
    isMerging: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
