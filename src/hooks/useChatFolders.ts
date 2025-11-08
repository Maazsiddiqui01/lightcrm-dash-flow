import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useChatFolders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["chat-folders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_folders")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as ChatFolder[];
    },
  });

  const createFolder = useMutation({
    mutationFn: async (folder: { name: string; color?: string; icon?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const maxOrder = folders.length > 0 
        ? Math.max(...folders.map(f => f.display_order)) 
        : 0;

      const { data, error } = await supabase
        .from("chat_folders")
        .insert([{ 
          name: folder.name,
          color: folder.color || "#6F42C1",
          icon: folder.icon || "folder",
          user_id: user.id,
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;
      return data as ChatFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-folders"] });
      toast({
        title: "Success",
        description: "Folder created",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChatFolder> & { id: string }) => {
      const { error } = await supabase
        .from("chat_folders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-folders"] });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_folders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-folders"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast({
        title: "Success",
        description: "Folder deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    },
  });

  const reorderFolders = useMutation({
    mutationFn: async (orderedFolders: { id: string; display_order: number }[]) => {
      const updates = orderedFolders.map(({ id, display_order }) =>
        supabase
          .from("chat_folders")
          .update({ display_order })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-folders"] });
    },
  });

  return {
    folders,
    isLoading,
    createFolder: createFolder.mutateAsync,
    updateFolder: updateFolder.mutateAsync,
    deleteFolder: deleteFolder.mutateAsync,
    reorderFolders: reorderFolders.mutateAsync,
  };
}
