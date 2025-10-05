/**
 * Subject Library CRUD Manager
 * Allows admins to add, edit, and delete subject line templates
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SubjectLibraryItem } from '@/hooks/useSubjectLibrary';

interface SubjectLibraryManagerProps {
  subjects: SubjectLibraryItem[];
}

export function SubjectLibraryManager({ subjects }: SubjectLibraryManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSubject, setEditingSubject] = useState<SubjectLibraryItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<SubjectLibraryItem>>({
    style: 'hybrid',
    subject_template: '',
    is_global: true,
  });

  const addSubject = useMutation({
    mutationFn: async (subject: Partial<SubjectLibraryItem>) => {
      const { error } = await supabase
        .from('subject_library' as any)
        .insert({
          style: subject.style,
          subject_template: subject.subject_template,
          is_global: subject.is_global,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-library'] });
      toast({ title: 'Subject added', description: 'New subject template has been created' });
      setIsAddingNew(false);
      setFormData({ style: 'hybrid', subject_template: '', is_global: true });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateSubject = useMutation({
    mutationFn: async (subject: SubjectLibraryItem) => {
      const { error } = await supabase
        .from('subject_library' as any)
        .update({
          style: subject.style,
          subject_template: subject.subject_template,
          is_global: subject.is_global,
        })
        .eq('id', subject.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-library'] });
      toast({ title: 'Subject updated', description: 'Subject template has been updated' });
      setEditingSubject(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSubject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subject_library' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-library'] });
      toast({ title: 'Subject deleted', description: 'Subject template has been removed' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (subject: SubjectLibraryItem) => {
    setFormData(subject);
    setEditingSubject(subject);
  };

  const handleAddNew = () => {
    setFormData({
      style: 'hybrid',
      subject_template: '',
      is_global: true,
    });
    setIsAddingNew(true);
  };

  const handleSave = () => {
    if (!formData.subject_template?.trim()) {
      toast({ title: 'Error', description: 'Subject template is required', variant: 'destructive' });
      return;
    }

    if (editingSubject) {
      updateSubject.mutate({ ...editingSubject, ...formData } as SubjectLibraryItem);
    } else {
      addSubject.mutate(formData);
    }
  };

  const groupedSubjects = {
    formal: subjects.filter(s => s.style === 'formal'),
    hybrid: subjects.filter(s => s.style === 'hybrid'),
    casual: subjects.filter(s => s.style === 'casual'),
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </div>

      <div className="space-y-6">
        {(['formal', 'hybrid', 'casual'] as const).map(style => (
          <div key={style}>
            <h3 className="text-sm font-medium mb-2 capitalize">{style} Style</h3>
            <div className="space-y-2">
              {groupedSubjects[style].length === 0 ? (
                <div className="text-sm text-muted-foreground">No {style} subject templates</div>
              ) : (
                groupedSubjects[style].map((subject) => (
                  <Card key={subject.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-sm font-mono">{subject.subject_template}</div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(subject)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteSubject.mutate(subject.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={!!editingSubject || isAddingNew} onOpenChange={(open) => {
        if (!open) {
          setEditingSubject(null);
          setIsAddingNew(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAddingNew ? 'Add' : 'Edit'} Subject Template</DialogTitle>
            <DialogDescription>
              Create subject line templates with tokens like [Focus Area], [Their Org], [Sector]
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Style *</Label>
              <Select
                value={formData.style}
                onValueChange={(value: any) => setFormData({ ...formData, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject Template *</Label>
              <Input
                value={formData.subject_template}
                onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                placeholder="Re: [Focus Area] Opportunity"
              />
              <p className="text-xs text-muted-foreground">
                Available tokens: [Focus Area], [Their Org], [My Org], [Sector]
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingSubject(null);
              setIsAddingNew(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={addSubject.isPending || updateSubject.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
