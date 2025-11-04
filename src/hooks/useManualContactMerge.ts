import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { edgeInvoke, formatEdgeError } from '@/lib/edgeInvoke';

interface MergeContactsParams {
  contactIds: string[];
  primaryId: string;
}

export function useManualContactMerge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ contactIds, primaryId }: MergeContactsParams) => {
      // Call edge function without a synthetic groupId; provide explicit IDs
      const result = await edgeInvoke('data_normalization', {
        action: 'merge_contacts',
        primaryId,
        contactIds,
        manual: true,
      });

      return result;
    },
    onSuccess: (data: any) => {
      // Invalidate likely caches
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-with-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['contact-email-counts'] });

      toast({
        title: 'Contacts merged successfully',
        description: `${data?.mergedCount ?? 'Selected'} contact(s) have been merged into one.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Merge failed',
        description: formatEdgeError(error, 'data_normalization'),
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
