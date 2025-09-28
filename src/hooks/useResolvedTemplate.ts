import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ResolvedTemplate {
  tone: 'casual' | 'neutral' | 'formal';
  length: 'brief' | 'mid' | 'long';
  subject_pool: string;
  chosen_subject: string;
  chosen_greeting: string;
  chosen_meeting_req: string;
  included_modules: string[];
  fa_defaults: Array<{
    focus_area_label: string;
    text_value: string;
  }>;
  fa_platforms: Array<{
    focus_area_label: string;
    text_value: string;
  }>;
  fa_addons: Array<{
    focus_area_label: string;
    text_value: string;
  }>;
  article_hint: {
    link: string;
    source: 'contact' | 'focus_area' | null;
  } | null;
}

export interface ResolveTemplateInput {
  template_id: string;
  contact_id: string;
  faList: string[];
  hasOpps: boolean;
  lagDays: number;
}

export function useResolvedTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: ResolveTemplateInput): Promise<ResolvedTemplate> => {
      const { data, error } = await supabase.functions.invoke('resolve_template', {
        body: input,
      });

      if (error) {
        console.error('ResolveTemplate error:', error);
        throw error;
      }

      return data as ResolvedTemplate;
    },
    onError: (error: any) => {
      console.error('ResolveTemplate mutation error:', error);
      toast({
        title: "Template Resolution Failed",
        description: error.message || "Failed to resolve template configuration",
        variant: "destructive",
      });
    },
  });
}

// Hook for caching resolved templates by session
export function useResolvedTemplateQuery(input: ResolveTemplateInput | null) {
  return useQuery({
    queryKey: ['resolved_template', input?.template_id, input?.contact_id, input?.lagDays],
    queryFn: async (): Promise<ResolvedTemplate | null> => {
      if (!input) return null;
      
      const { data, error } = await supabase.functions.invoke('resolve_template', {
        body: input,
      });

      if (error) throw error;
      return data as ResolvedTemplate;
    },
    enabled: !!input?.template_id && !!input?.contact_id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}