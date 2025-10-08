import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import type { TeamMember } from '@/components/email-builder/EditableTeam';

export interface ContactSavePayload {
  contactId: string;
  contactName: string;
  templateId: string | null;
  moduleStates: ModuleStates;
  deltaType: 'Email' | 'Meeting';
  moduleOrder: string[] | null;
  moduleSelections: Record<string, any> | null;
  curatedRecipients: {
    team?: TeamMember[];
    to?: string;
    cc?: string[];
  } | null;
  currentRevision?: number;
}

export interface GlobalSavePayload {
  templateId: string;
  templateName: string;
  toneOverride: string | null;
  lengthOverride: string | null;
  moduleStates: ModuleStates;
  moduleOrder: string[] | null;
  currentRevision?: number;
}

interface UndoEntry {
  scope: 'contact' | 'global';
  entityId: string;
  timestamp: Date;
  data: any;
}

const undoStack: UndoEntry[] = [];
const UNDO_TIMEOUT = 10000; // 10 seconds

/**
 * Prunes expired entries from undo stack to prevent memory leak
 */
function pruneUndoStack() {
  const cutoff = new Date(Date.now() - UNDO_TIMEOUT);
  const validIndex = undoStack.findIndex(entry => entry.timestamp > cutoff);
  
  if (validIndex > 0) {
    undoStack.splice(0, validIndex);
  } else if (validIndex === -1 && undoStack.length > 0) {
    // All entries expired
    undoStack.length = 0;
  }
}

/**
 * Hook providing save operations for both contact-specific and global template settings
 * Supports undo functionality with 10-second window
 */
export function useSaveSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save for specific contact only
  const saveContactMutation = useMutation({
    mutationFn: async (payload: ContactSavePayload) => {
      // Validate template ID is present
      if (!payload.templateId) {
        throw new Error('Template ID is required for saving contact settings');
      }
      
      // Prune expired undo entries before adding new one
      pruneUndoStack();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: existing, error: fetchError } = await supabase
        .from('contact_email_builder_settings')
        .select('*')
        .eq('contact_id', payload.contactId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const newRevision = (existing?.revision || payload.currentRevision || 0) + 1;

      // Upsert contact settings
      const { data, error } = await supabase
        .from('contact_email_builder_settings')
        .upsert({
          contact_id: payload.contactId,
          template_id: payload.templateId,
          module_states: payload.moduleStates as any,
          delta_type: payload.deltaType,
          module_order: payload.moduleOrder as any,
          module_selections: payload.moduleSelections as any,
          curated_recipients: payload.curatedRecipients as any,
          revision: newRevision,
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit entry
      await supabase.from('email_settings_audit').insert({
        scope: 'contact',
        entity_id: payload.contactId,
        entity_type: 'contact',
        changes_before: existing || null,
        changes_after: data,
        revision_before: existing?.revision || 0,
        revision_after: newRevision,
        changed_by: user?.id,
      });

      // Add to undo stack
      undoStack.push({
        scope: 'contact',
        entityId: payload.contactId,
        timestamp: new Date(),
        data: existing || null,
      });

      return { data, payload };
    },
    onSuccess: ({ data, payload }) => {
      queryClient.invalidateQueries({ queryKey: ['contact-settings', payload.contactId] });
      
      toast({
        title: "Saved for this contact",
        description: `Settings saved only for ${payload.contactName}`,
        duration: 10000, // 10 seconds for undo
        action: (
          <ToastAction 
            altText="Undo" 
            onClick={() => handleUndo('contact', payload.contactId)}
          >
            Undo
          </ToastAction>
        ),
      });
    },
    onError: (error: any) => {
      console.error('Contact save error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save contact settings",
        variant: "destructive",
      });
    },
  });

  // Save to Global (template-level) - Only Core Settings + Email Modules
  const saveGlobalMutation = useMutation({
    mutationFn: async (payload: GlobalSavePayload) => {
      // Prune expired undo entries before adding new one
      pruneUndoStack();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: existing, error: fetchError } = await supabase
        .from('email_template_settings')
        .select('*')
        .eq('template_id', payload.templateId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const newRevision = (existing?.revision || payload.currentRevision || 0) + 1;

      // Only Core Settings + Email Modules allowed for global saves
      const { data, error } = await supabase
        .from('email_template_settings')
        .upsert({
          template_id: payload.templateId,
          tone_override: payload.toneOverride,
          length_override: payload.lengthOverride,
          module_states: payload.moduleStates as any,
          module_order: payload.moduleOrder as any,
          revision: newRevision,
          updated_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit entry
      await supabase.from('email_settings_audit').insert({
        scope: 'global',
        entity_id: payload.templateId,
        entity_type: 'template',
        changes_before: existing || null,
        changes_after: data,
        revision_before: existing?.revision || 0,
        revision_after: newRevision,
        changed_by: user?.id,
      });

      // Add to undo stack
      undoStack.push({
        scope: 'global',
        entityId: payload.templateId,
        timestamp: new Date(),
        data: existing || null,
      });

      return { data, payload };
    },
    onSuccess: ({ data, payload }) => {
      queryClient.invalidateQueries({ queryKey: ['template-settings', payload.templateId] });
      
      toast({
        title: "Global defaults updated",
        description: `Updated defaults for ${payload.templateName}. Affects Core Settings + Email Modules only.`,
        duration: 10000, // 10 seconds for undo
        action: (
          <ToastAction 
            altText="Undo" 
            onClick={() => handleUndo('global', payload.templateId)}
          >
            Undo
          </ToastAction>
        ),
      });
    },
    onError: (error: any) => {
      console.error('Global save error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to update global defaults",
        variant: "destructive",
      });
    },
  });

  const handleUndo = async (scope: 'contact' | 'global', entityId: string) => {
    // Find most recent entry for this entity within 10s window
    const cutoff = new Date(Date.now() - UNDO_TIMEOUT);
    const entry = undoStack
      .filter(e => e.scope === scope && e.entityId === entityId && e.timestamp > cutoff)
      .pop();

    if (!entry) {
      toast({
        title: "Undo Failed",
        description: "Undo window has expired (10 seconds)",
        variant: "destructive",
      });
      return;
    }

    try {
      if (scope === 'contact') {
        if (entry.data) {
          // Restore previous state
          await supabase
            .from('contact_email_builder_settings')
            .upsert(entry.data)
            .eq('contact_id', entityId);
        } else {
          // Was a new entry, delete it
          await supabase
            .from('contact_email_builder_settings')
            .delete()
            .eq('contact_id', entityId);
        }
        queryClient.invalidateQueries({ queryKey: ['contact-settings', entityId] });
      } else {
        if (entry.data) {
          await supabase
            .from('email_template_settings')
            .upsert(entry.data)
            .eq('template_id', entityId);
        } else {
          await supabase
            .from('email_template_settings')
            .delete()
            .eq('template_id', entityId);
        }
        queryClient.invalidateQueries({ queryKey: ['template-settings', entityId] });
      }

      toast({
        title: "Changes undone",
        description: "Reverted to previous version",
      });
    } catch (error: any) {
      console.error('Undo error:', error);
      toast({
        title: "Undo Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    saveContact: saveContactMutation.mutate,
    saveGlobal: saveGlobalMutation.mutate,
    isSaving: saveContactMutation.isPending || saveGlobalMutation.isPending,
  };
}
