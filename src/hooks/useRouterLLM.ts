import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface RouterLLMInput {
  gb_present: boolean;
  fa_count: number;
  has_opps: boolean;
  delta_type: string;
  hs_present: boolean;
  ls_present: boolean;
  summary_sector_list: string[];
}

export interface RouterLLMResult {
  case_id: number;
  reason: string;
  variables: {
    gb_present: boolean;
    fa_count: number;
    has_opps: boolean;
    delta_type: string;
    hs_present: boolean;
    ls_present: boolean;
    ebitda_mode: string;
    summary_sector_list: string[];
  };
}

export function useRouterLLM() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: RouterLLMInput): Promise<RouterLLMResult> => {
      const { data, error } = await supabase.functions.invoke('router_llm', {
        body: input,
      });

      if (error) {
        logger.error('RouterLLM error:', error);
        throw error;
      }

      return data as RouterLLMResult;
    },
    onError: (error: any) => {
      logger.error('RouterLLM mutation error:', error);
      toast({
        title: "Routing Error",
        description: error.message || "Failed to determine template routing",
        variant: "destructive",
      });
    },
  });
}