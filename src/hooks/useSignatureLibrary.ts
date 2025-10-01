import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SignatureLibraryItem {
  id: string;
  tone: 'formal' | 'hybrid' | 'casual';
  signature_text: string;
  is_global: boolean;
  template_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch global signatures
export function useGlobalSignatures() {
  return useQuery({
    queryKey: ['signatures', 'global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signature_library')
        .select('*')
        .eq('is_global', true)
        .eq('active', true)
        .order('tone');

      if (error) throw error;
      return data as SignatureLibraryItem[];
    },
  });
}

// Pick signature based on tone
export async function pickSignature(tone: 'formal' | 'hybrid' | 'casual'): Promise<string> {
  const { data, error } = await supabase
    .from('signature_library')
    .select('signature_text')
    .eq('tone', tone)
    .eq('is_global', true)
    .eq('active', true)
    .single();

  if (error || !data) {
    console.warn('Failed to fetch signature, using fallback:', error);
    const fallbacks = { casual: '-Tom', hybrid: 'Best, Tom', formal: 'Regards, Tom' };
    return fallbacks[tone];
  }

  return data.signature_text;
}

// Create signature
export function useCreateSignature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<SignatureLibraryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('signature_library')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      toast({ title: 'Signature created' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create signature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update signature
export function useUpdateSignature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SignatureLibraryItem> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('signature_library')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      toast({ title: 'Signature updated' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update signature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete signature
export function useDeleteSignature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('signature_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      toast({ title: 'Signature deleted' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete signature',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
