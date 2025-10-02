/**
 * Team & Assistant Directory CRUD Manager
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TeamDirectoryEntry {
  focus_area: string;
  lead1_name?: string;
  lead1_email?: string;
  lead2_name?: string;
  lead2_email?: string;
  assistant_name?: string;
  assistant_email?: string;
}

interface TeamDirectoryManagerProps {
  entries: TeamDirectoryEntry[];
}

export function TeamDirectoryManager({ entries }: TeamDirectoryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingEntry, setEditingEntry] = useState<TeamDirectoryEntry | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<TeamDirectoryEntry>({
    focus_area: '',
    lead1_name: '',
    lead1_email: '',
    lead2_name: '',
    lead2_email: '',
    assistant_name: '',
    assistant_email: '',
  });

  const updateEntry = useMutation({
    mutationFn: async (entry: TeamDirectoryEntry) => {
      const { error } = await supabase
        .from('lg_focus_area_directory' as any)
        .upsert(entry, { onConflict: 'focus_area' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
      toast({ title: 'Entry updated', description: 'Team directory has been updated' });
      setEditingEntry(null);
      setIsAddingNew(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (focusArea: string) => {
      const { error } = await supabase
        .from('lg_focus_area_directory' as any)
        .delete()
        .eq('focus_area', focusArea);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
      toast({ title: 'Entry deleted', description: 'Team directory entry has been removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (entry: TeamDirectoryEntry) => {
    setFormData(entry);
    setEditingEntry(entry);
  };

  const handleAddNew = () => {
    setFormData({
      focus_area: '',
      lead1_name: '',
      lead1_email: '',
      lead2_name: '',
      lead2_email: '',
      assistant_name: '',
      assistant_email: '',
    });
    setIsAddingNew(true);
  };

  const handleSave = () => {
    if (!formData.focus_area.trim()) {
      toast({ title: 'Error', description: 'Focus area is required', variant: 'destructive' });
      return;
    }
    updateEntry.mutate(formData);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">No team directory entries</div>
        ) : (
          entries.map((entry) => (
            <Card key={entry.focus_area}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="font-medium">{entry.focus_area}</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground text-xs mb-1">Lead 1</div>
                        {entry.lead1_name && (
                          <div>
                            <div>{entry.lead1_name}</div>
                            <div className="text-muted-foreground text-xs">{entry.lead1_email}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs mb-1">Lead 2</div>
                        {entry.lead2_name && (
                          <div>
                            <div>{entry.lead2_name}</div>
                            <div className="text-muted-foreground text-xs">{entry.lead2_email}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs mb-1">Assistant</div>
                        {entry.assistant_name && (
                          <div>
                            <div>{entry.assistant_name}</div>
                            <div className="text-muted-foreground text-xs">{entry.assistant_email}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteEntry.mutate(entry.focus_area)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={!!editingEntry || isAddingNew} onOpenChange={(open) => {
        if (!open) {
          setEditingEntry(null);
          setIsAddingNew(false);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isAddingNew ? 'Add' : 'Edit'} Team Directory Entry</DialogTitle>
            <DialogDescription>
              Manage focus area leads and assistants for auto-CC and coordination
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Focus Area *</Label>
              <Input
                value={formData.focus_area}
                onChange={(e) => setFormData({ ...formData, focus_area: e.target.value })}
                placeholder="e.g., Healthcare IT"
                disabled={!!editingEntry}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead 1 Name</Label>
                <Input
                  value={formData.lead1_name}
                  onChange={(e) => setFormData({ ...formData, lead1_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Lead 1 Email</Label>
                <Input
                  type="email"
                  value={formData.lead1_email}
                  onChange={(e) => setFormData({ ...formData, lead1_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead 2 Name</Label>
                <Input
                  value={formData.lead2_name}
                  onChange={(e) => setFormData({ ...formData, lead2_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Lead 2 Email</Label>
                <Input
                  type="email"
                  value={formData.lead2_email}
                  onChange={(e) => setFormData({ ...formData, lead2_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assistant Name</Label>
                <Input
                  value={formData.assistant_name}
                  onChange={(e) => setFormData({ ...formData, assistant_name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Assistant Email</Label>
                <Input
                  type="email"
                  value={formData.assistant_email}
                  onChange={(e) => setFormData({ ...formData, assistant_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingEntry(null);
              setIsAddingNew(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateEntry.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
