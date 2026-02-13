import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FocusAreaDescriptionRow {
  Unique_ID: number;
  'LG Sector': string;
  'LG Focus Area': string;
  'Platform / Add-On': string;
  'Existing Platform (for Add-Ons)': string | null;
  Description: string;
}

export function useAllFocusAreaDescriptions() {
  return useQuery({
    queryKey: ['all_focus_area_descriptions'],
    queryFn: async (): Promise<FocusAreaDescriptionRow[]> => {
      const { data, error } = await supabase
        .from('focus_area_description')
        .select('*')
        .order('LG Focus Area' as any);

      if (error) {
        console.error('Error fetching all focus area descriptions:', error);
        throw error;
      }

      return (data || []) as unknown as FocusAreaDescriptionRow[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export interface CreateFocusAreaDescriptionInput {
  sector: string;
  focusArea: string;
  platformType: string;
  existingPlatform: string | null;
  description: string;
}

export function useCreateFocusAreaDescription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateFocusAreaDescriptionInput) => {
      const { data, error } = await supabase
        .from('focus_area_description')
        .insert({
          'LG Sector': input.sector,
          'LG Focus Area': input.focusArea,
          'Platform / Add-On': input.platformType,
          'Existing Platform (for Add-Ons)': input.existingPlatform,
          Description: input.description,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_focus_area_descriptions'] });
      queryClient.invalidateQueries({ queryKey: ['focus_area_descriptions'] });
      toast({
        title: 'Entry Created',
        description: 'New focus area description has been added.',
      });
    },
    onError: (error) => {
      console.error('Failed to create focus area description:', error);
      toast({
        title: 'Creation Failed',
        description: 'Could not add the entry. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateFocusAreaDescription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ uniqueId, description }: { uniqueId: number; description: string }) => {
      const { error } = await supabase
        .from('focus_area_description')
        .update({ Description: description } as any)
        .eq('Unique_ID', uniqueId as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_focus_area_descriptions'] });
      queryClient.invalidateQueries({ queryKey: ['focus_area_descriptions'] });
      toast({
        title: 'Description Saved',
        description: 'Focus area description has been updated.',
      });
    },
    onError: (error) => {
      console.error('Failed to update focus area description:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not update the description. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
