import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroupNote {
  group_name: string;
  field: string;
  content: string;
  created_at: string;
  created_by: string | null;
}

interface GroupCurrentNotes {
  notes: string | null;
  updated_at: string | null;
}

export const useGroupNotes = (groupId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current group notes from groups table
  const currentNotesQuery = useQuery({
    queryKey: ['group-notes', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      
      const { data, error } = await supabase
        .from('groups')
        .select('notes, updated_at')
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      return data as GroupCurrentNotes;
    },
    enabled: !!groupId,
  });

  // Fetch group notes timeline (still uses group_name in the view for now)
  const timelineQuery = useQuery({
    queryKey: ['group-notes-timeline', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      // First get the group name
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single();
      
      if (groupError) throw groupError;
      
      const { data, error } = await supabase
        .from('group_notes_timeline')
        .select('*')
        .eq('group_name', groupData.name)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GroupNote[];
    },
    enabled: !!groupId,
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async ({ groupId, content }: { groupId: string; content: string }) => {
      const { error } = await supabase.rpc('add_group_note', {
        p_group_id: groupId,
        p_field: 'group_notes',
        p_content: content,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group notes saved successfully",
      });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['group-notes', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-notes-timeline', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error) => {
      console.error('Error saving group notes:', error);
      toast({
        title: "Error",
        description: "Failed to save group notes",
        variant: "destructive",
      });
    },
  });

  return {
    currentNotes: currentNotesQuery.data,
    timeline: timelineQuery.data || [],
    isLoadingCurrent: currentNotesQuery.isLoading,
    isLoadingTimeline: timelineQuery.isLoading,
    saveNotes: (content: string) => {
      if (!groupId) return;
      saveNotesMutation.mutate({ groupId, content });
    },
    isSavingNotes: saveNotesMutation.isPending,
  };
};
