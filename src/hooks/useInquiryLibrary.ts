import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type InquiryCategory = 'opportunity' | 'article' | 'focus_area' | 'generic';

export interface InquiryLibraryItem {
  id: string;
  category: InquiryCategory;
  inquiry_text: string;
  is_global: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useInquiryLibrary(templateId?: string | null, category?: InquiryCategory) {
  return useQuery({
    queryKey: ['inquiry-library', templateId, category],
    queryFn: async () => {
      let query = supabase
        .from('inquiry_library' as any)
        .select('*')
        .order('created_at', { ascending: true });

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as InquiryLibraryItem[];
    },
    enabled: templateId !== undefined || category !== undefined,
  });
}

export function useGlobalInquiries(category?: InquiryCategory) {
  return useQuery({
    queryKey: ['inquiry-library', 'global', category],
    queryFn: async () => {
      let query = supabase
        .from('inquiry_library' as any)
        .select('*')
        .eq('is_global', true)
        .order('category', { ascending: true })
        .order('created_at', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as InquiryLibraryItem[];
    },
  });
}

export function useCreateInquiry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inquiry: Omit<InquiryLibraryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('inquiry_library' as any)
        .insert(inquiry as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry-library'] });
      toast({
        title: 'Inquiry added',
        description: 'The inquiry has been added to the library',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding inquiry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInquiry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InquiryLibraryItem> }) => {
      const { data, error } = await supabase
        .from('inquiry_library' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry-library'] });
      toast({
        title: 'Inquiry updated',
        description: 'The inquiry has been updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating inquiry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInquiry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inquiry_library' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry-library'] });
      toast({
        title: 'Inquiry deleted',
        description: 'The inquiry has been removed from the library',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting inquiry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}