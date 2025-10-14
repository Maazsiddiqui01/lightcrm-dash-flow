/**
 * Hook for persisting and loading module & subject defaults
 * Handles contact-level and template-level default phrase/subject configurations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface ModuleDefault {
  module_key: string;
  phrase_id: string;
  phrase_text: string;
}

interface SubjectDefault {
  subject_id: string;
  subject_text: string;
}

/**
 * Loads contact-level module defaults
 */
export function useContactModuleDefaults(contactId: string | null, templateId: string | null) {
  return useQuery({
    queryKey: ['contact-module-defaults', contactId, templateId],
    queryFn: async () => {
      if (!contactId) {
        logger.warn('useContactModuleDefaults: contactId is null');
        return [];
      }
      
      if (!templateId) {
        logger.warn('useContactModuleDefaults: templateId is null');
        return [];
      }
      
      const { data, error } = await supabase
        .from('contact_module_defaults')
        .select('*')
        .eq('contact_id', contactId)
        .eq('template_id', templateId);
      
      if (error) {
        logger.error('Load contact module defaults error:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!contactId && !!templateId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Loads template-level module defaults
 */
export function useTemplateModuleDefaults(templateId: string | null) {
  return useQuery({
    queryKey: ['template-module-defaults', templateId],
    queryFn: async () => {
      if (!templateId) {
        logger.warn('useTemplateModuleDefaults: templateId is null');
        return [];
      }
      
      const { data, error } = await supabase
        .from('template_module_defaults')
        .select('*')
        .eq('template_id', templateId);
      
      if (error) {
        logger.error('Load template module defaults error:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!templateId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Saves contact-level module defaults (upsert)
 */
export function useSaveContactModuleDefaults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      contactId,
      templateId,
      defaults,
      contactIds,
    }: {
      contactId?: string;
      templateId: string;
      defaults: ModuleDefault[];
      contactIds?: string[]; // For bulk saving to multiple contacts
    }) => {
      const targetContactIds = contactIds || (contactId ? [contactId] : []);
      
      if (targetContactIds.length === 0) {
        throw new Error('No contact IDs provided');
      }
      
      // Delete existing defaults for all target contacts+template
      const { error: deleteError } = await supabase
        .from('contact_module_defaults')
        .delete()
        .in('contact_id', targetContactIds)
        .eq('template_id', templateId);
      
      if (deleteError) throw deleteError;
      
      // Insert new defaults for all target contacts
      if (defaults.length > 0) {
        const records = targetContactIds.flatMap(cId =>
          defaults.map(d => ({
            contact_id: cId,
            template_id: templateId,
            module_key: d.module_key,
            phrase_id: d.phrase_id,
            phrase_text: d.phrase_text,
          }))
        );
        
        const { error: insertError } = await supabase
          .from('contact_module_defaults')
          .insert(records);
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['contact-module-defaults', variables.contactId, variables.templateId],
      });
      
      toast({
        title: "Defaults Saved",
        description: "Contact module defaults saved successfully",
      });
    },
    onError: (error) => {
      logger.error('Save contact module defaults error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save contact module defaults",
        variant: "destructive",
      });
    },
  });
}

/**
 * Saves template-level module defaults (upsert)
 */
export function useSaveTemplateModuleDefaults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      templateId,
      defaults,
    }: {
      templateId: string;
      defaults: ModuleDefault[];
    }) => {
      // Delete existing defaults for this template
      const { error: deleteError } = await supabase
        .from('template_module_defaults')
        .delete()
        .eq('template_id', templateId);
      
      if (deleteError) throw deleteError;
      
      // Insert new defaults
      if (defaults.length > 0) {
        const { error: insertError } = await supabase
          .from('template_module_defaults')
          .insert(
            defaults.map(d => ({
              template_id: templateId,
              module_key: d.module_key,
              phrase_id: d.phrase_id,
              phrase_text: d.phrase_text,
            }))
          );
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['template-module-defaults', variables.templateId],
      });
      
      toast({
        title: "Defaults Saved",
        description: "Template module defaults saved successfully",
      });
    },
    onError: (error) => {
      logger.error('Save template module defaults error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save template module defaults",
        variant: "destructive",
      });
    },
  });
}
