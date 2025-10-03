import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContactDuplicate {
  id: string;
  email_address: string;
  user_count: number;
  status: 'active' | 'resolved' | 'accepted';
  first_detected_at: string;
  last_updated_at: string;
  resolved_at?: string;
  resolution_note?: string;
  contacts: Array<{
    contact_id: string;
    full_name: string;
    organization?: string;
    user_id: string;
    user_email: string;
    user_name: string;
    created_at: string;
  }>;
}

export function useContactDuplicates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: duplicates = [], isLoading } = useQuery({
    queryKey: ['contact-duplicates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_duplicates_detailed')
        .select('*')
        .order('last_updated_at', { ascending: false });

      if (error) throw error;
      return data as ContactDuplicate[];
    },
  });

  const resolveDuplicate = useMutation({
    mutationFn: async ({
      duplicateId,
      status,
      note,
    }: {
      duplicateId: string;
      status: 'resolved' | 'accepted';
      note?: string;
    }) => {
      const { error } = await supabase
        .from('contact_duplicates')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolution_note: note,
        })
        .eq('id', duplicateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-duplicates'] });
      toast({
        title: 'Duplicate resolved',
        description: 'The duplicate contact has been resolved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to resolve duplicate: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    duplicates,
    isLoading,
    resolveDuplicate: resolveDuplicate.mutate,
    isResolving: resolveDuplicate.isPending,
  };
}

export function useContactDuplicateCheck(email?: string) {
  return useQuery({
    queryKey: ['contact-duplicate-check', email],
    queryFn: async () => {
      if (!email) return null;

      const { data, error } = await supabase
        .from('contact_duplicates_detailed')
        .select('*')
        .eq('email_address', email.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;
      return data as ContactDuplicate | null;
    },
    enabled: !!email,
  });
}
