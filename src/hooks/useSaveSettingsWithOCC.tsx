import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { ModuleStates } from '@/components/email-builder/ModulesCard';
import type { TeamMember } from '@/components/email-builder/EditableTeam';
import { saveWithOCC, type ConflictData } from '@/lib/optimisticConcurrency';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

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
 * Hook providing save operations with Optimistic Concurrency Control (OCC)
 * Handles 409 conflicts with merge/overwrite dialog
 */
export function useSaveSettingsWithOCC() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    conflicts: ConflictData[];
    serverData: any;
    onResolve: (action: 'overwrite' | 'cancel') => void;
  }>({
    open: false,
    conflicts: [],
    serverData: null,
    onResolve: () => {},
  });

  // Save for specific contact with OCC
  const saveContactMutation = useMutation({
    mutationFn: async (payload: ContactSavePayload) => {
      // Validate template ID is present
      if (!payload.templateId) {
        throw new Error('Template ID is required for saving contact settings');
      }
      
      pruneUndoStack();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const result = await saveWithOCC(
        'contact_email_builder_settings',
        payload.contactId,
        {
          contact_id: payload.contactId,
          template_id: payload.templateId,
          module_states: payload.moduleStates as any,
          delta_type: payload.deltaType,
          module_order: payload.moduleOrder as any,
          module_selections: payload.moduleSelections as any,
          curated_recipients: payload.curatedRecipients as any,
          revision: payload.currentRevision,
        },
        {
          idColumn: 'contact_id',
          onConflict: async (conflicts, serverData) => {
            return new Promise((resolve) => {
              setConflictDialog({
                open: true,
                conflicts,
                serverData,
                onResolve: (action) => {
                  setConflictDialog(prev => ({ ...prev, open: false }));
                  if (action === 'overwrite') {
                    resolve({ action: 'overwrite' });
                  } else {
                    resolve({ action: 'cancel' });
                  }
                },
              });
            });
          },
        }
      );

      if (!result.success) {
        throw new Error('Save failed with conflicts');
      }

      // Create audit entry
      await supabase.from('email_settings_audit').insert({
        scope: 'contact',
        entity_id: payload.contactId,
        entity_type: 'contact',
        changes_after: result.data,
        changed_by: user?.id,
      });

      undoStack.push({
        scope: 'contact',
        entityId: payload.contactId,
        timestamp: new Date(),
        data: result.data,
      });

      return { data: result.data, payload };
    },
    onSuccess: ({ data, payload }) => {
      queryClient.invalidateQueries({ queryKey: ['contact-settings', payload.contactId] });
      
      toast({
        title: "Saved for this contact",
        description: `Settings saved only for ${payload.contactName}`,
        duration: 10000,
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

  // Save to Global with OCC
  const saveGlobalMutation = useMutation({
    mutationFn: async (payload: GlobalSavePayload) => {
      pruneUndoStack();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const result = await saveWithOCC(
        'email_template_settings',
        payload.templateId,
        {
          template_id: payload.templateId,
          tone_override: payload.toneOverride,
          length_override: payload.lengthOverride,
          module_states: payload.moduleStates as any,
          module_order: payload.moduleOrder as any,
          revision: payload.currentRevision,
          updated_by: user?.id,
        },
        {
          idColumn: 'template_id',
          onConflict: async (conflicts, serverData) => {
            return new Promise((resolve) => {
              setConflictDialog({
                open: true,
                conflicts,
                serverData,
                onResolve: (action) => {
                  setConflictDialog(prev => ({ ...prev, open: false }));
                  if (action === 'overwrite') {
                    resolve({ action: 'overwrite' });
                  } else {
                    resolve({ action: 'cancel' });
                  }
                },
              });
            });
          },
        }
      );

      if (!result.success) {
        throw new Error('Save failed with conflicts');
      }

      await supabase.from('email_settings_audit').insert({
        scope: 'global',
        entity_id: payload.templateId,
        entity_type: 'template',
        changes_after: result.data,
        changed_by: user?.id,
      });

      undoStack.push({
        scope: 'global',
        entityId: payload.templateId,
        timestamp: new Date(),
        data: result.data,
      });

      return { data: result.data, payload };
    },
    onSuccess: ({ data, payload }) => {
      queryClient.invalidateQueries({ queryKey: ['template-settings', payload.templateId] });
      
      toast({
        title: "Global defaults updated",
        description: `Updated defaults for ${payload.templateName}`,
        duration: 10000,
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
          await supabase
            .from('contact_email_builder_settings')
            .upsert(entry.data)
            .eq('contact_id', entityId);
        } else {
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

  // Conflict Resolution Dialog
  const ConflictDialog = () => (
    <Dialog open={conflictDialog.open} onOpenChange={(open) => !open && conflictDialog.onResolve('cancel')}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Conflicting Changes Detected
          </DialogTitle>
          <DialogDescription>
            Another user has modified these settings. Your changes conflict with theirs:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {conflictDialog.conflicts.map((conflict, idx) => (
            <div key={idx} className="p-3 bg-muted rounded-lg space-y-1">
              <p className="font-medium text-sm">{conflict.field}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Your change:</p>
                  <code className="block p-1 bg-background rounded">{JSON.stringify(conflict.local)}</code>
                </div>
                <div>
                  <p className="text-muted-foreground">Their change:</p>
                  <code className="block p-1 bg-background rounded">{JSON.stringify(conflict.server)}</code>
                </div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => conflictDialog.onResolve('cancel')}>
            Cancel (Keep Theirs)
          </Button>
          <Button variant="destructive" onClick={() => conflictDialog.onResolve('overwrite')}>
            Overwrite with Mine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    saveContact: saveContactMutation.mutate,
    saveGlobal: saveGlobalMutation.mutate,
    isSaving: saveContactMutation.isPending || saveGlobalMutation.isPending,
    ConflictDialog,
  };
}
