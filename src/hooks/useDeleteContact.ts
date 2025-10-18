import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteContactOptions {
  onSuccess?: () => void;
}

export function useDeleteContact(options?: DeleteContactOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteSingleMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts_raw")
        .delete()
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contactStats"] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const deleteBulkMutation = useMutation({
    mutationFn: async (contactIds: string[]) => {
      const { error } = await supabase
        .from("contacts_raw")
        .delete()
        .in("id", contactIds);

      if (error) throw error;
      return contactIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contactStats"] });
      toast({
        title: "Success",
        description: `${count} contact${count !== 1 ? "s" : ""} deleted successfully`,
      });
      options?.onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Error deleting contacts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete contacts",
        variant: "destructive",
      });
    },
  });

  return {
    deleteContact: deleteSingleMutation.mutate,
    deleteBulk: deleteBulkMutation.mutate,
    isDeleting: deleteSingleMutation.isPending || deleteBulkMutation.isPending,
  };
}
