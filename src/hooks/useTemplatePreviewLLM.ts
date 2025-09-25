import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TemplatePreviewInput {
  firstName: string;
  organization: string;
  focusAreas: string[];
  descriptions: Record<string, string>;
  focusAreaDescriptions: Array<{
    focus_area: string;
    description: string;
    platform_type: string;
    sector: string;
  }>;
  delta_type: string;
  hs_present: boolean;
  ls_present: boolean;
  has_opps: boolean;
}

export function useTemplatePreviewLLM() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: TemplatePreviewInput): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('template_preview_llm', {
        body: input,
      });

      if (error) {
        console.error('TemplatePreviewLLM error:', error);
        throw error;
      }

      return data as string;
    },
    onError: (error: any) => {
      console.error('TemplatePreviewLLM mutation error:', error);
      toast({
        title: "Preview Error",
        description: error.message || "Failed to generate template preview",
        variant: "destructive",
      });
    },
  });
}