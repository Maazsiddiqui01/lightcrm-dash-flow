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
  group_notes: string | null;
  updated_at: string | null;
}

export const useGroupNotes = (groupName: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current group notes (from any member of the group)
  const currentNotesQuery = useQuery({
    queryKey: ['group-notes', groupName],
    queryFn: async () => {
      if (!groupName) return null;
      
      const { data, error } = await supabase
        .from('contacts_raw')
        .select('group_notes, updated_at')
        .eq('group_contact', groupName)
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as GroupCurrentNotes;
    },
    enabled: !!groupName,
  });

  // Fetch group notes timeline
  const timelineQuery = useQuery({
    queryKey: ['group-notes-timeline', groupName],
    queryFn: async () => {
      if (!groupName) return [];
      
      const { data, error } = await supabase
        .from('group_notes_timeline')
        .select('*')
        .eq('group_name', groupName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GroupNote[];
    },
    enabled: !!groupName,
  });

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async ({ groupName, content }: { groupName: string; content: string }) => {
      const { error } = await supabase.rpc('add_group_note', {
        p_group_name: groupName,
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
      queryClient.invalidateQueries({ queryKey: ['group-notes', groupName] });
      queryClient.invalidateQueries({ queryKey: ['group-notes-timeline', groupName] });
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
      if (!groupName) return;
      saveNotesMutation.mutate({ groupName, content });
    },
    isSavingNotes: saveNotesMutation.isPending,
  };
};
