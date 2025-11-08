import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  message_count: number;
  folder_id: string | null;
  archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
}

export function useChatConversations(folderId?: string | null, showArchived: boolean = false) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["chat-conversations", folderId, showArchived],
    queryFn: async () => {
      let query = supabase
        .from("chat_conversations")
        .select("*");

      // Filter by archived status
      query = query.eq("archived", showArchived);

      // Filter by folder if specified
      if (folderId === "unassigned") {
        query = query.is("folder_id", null);
      } else if (folderId) {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ChatConversation[];
    },
  });

  const createConversation = useMutation({
    mutationFn: async (data: { title?: string; folderId?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const defaultTitle = data.title || `New Chat - ${new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;

      const { data: result, error } = await supabase
        .from("chat_conversations")
        .insert([{ 
          title: defaultTitle,
          user_id: user.id,
          folder_id: data.folderId || null
        }])
        .select()
        .single();

      if (error) throw error;
      return result as ChatConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const updateConversation = useMutation({
    mutationFn: async ({ id, title, folder_id }: { id: string; title?: string; folder_id?: string | null }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (title !== undefined) updates.title = title;
      if (folder_id !== undefined) updates.folder_id = folder_id;

      const { error } = await supabase
        .from("chat_conversations")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  const archiveConversation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("chat_conversations")
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString(),
          archived_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast({
        title: "Archived",
        description: "Conversation moved to archive",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive conversation",
        variant: "destructive",
      });
    },
  });

  const unarchiveConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ 
          archived: false, 
          archived_at: null,
          archived_by: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast({
        title: "Restored",
        description: "Conversation restored from archive",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore conversation",
        variant: "destructive",
      });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast({
        title: "Success",
        description: "Conversation deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    },
  });

  return {
    conversations,
    isLoading,
    createConversation: createConversation.mutateAsync,
    updateConversation: updateConversation.mutateAsync,
    deleteConversation: deleteConversation.mutateAsync,
    archiveConversation: archiveConversation.mutateAsync,
    unarchiveConversation: unarchiveConversation.mutateAsync,
  };
}
