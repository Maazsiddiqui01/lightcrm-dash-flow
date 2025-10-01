import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  is_preset: boolean;
  gb_present?: boolean;
  fa_bucket?: number;
  has_opps?: boolean;
  delta_type?: string;
  subject_mode?: string;
  hs_present?: boolean;
  ls_present?: boolean;
  max_opps?: number;
  custom_instructions?: string;
  custom_insertion?: string;
  created_at?: string;
}

const QUERY_KEY = 'email_templates';

export function useEmailTemplatesQuery() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('is_preset', { ascending: false })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useCreateTemplateMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: Omit<EmailTemplate, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTemplateMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTemplateMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });
}

export function useDuplicateTemplateMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const newTemplate = {
        ...template,
        name: `${template.name} (Copy)`,
        is_preset: false, // Always make duplicates custom
      };
      
      // Remove fields that shouldn't be copied
      delete newTemplate.id;
      delete newTemplate.created_at;
      
      const { data, error } = await supabase
        .from('email_templates')
        .insert(newTemplate)
        .select()
        .single();
      
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate template",
        variant: "destructive",
      });
    },
  });
}

// Aliases for backward compatibility
export const useCreateTemplate = useCreateTemplateMutation;
export const useUpdateTemplate = useUpdateTemplateMutation;
export const useEmailTemplates = useEmailTemplatesQuery;