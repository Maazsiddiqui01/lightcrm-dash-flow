import { useMutation, useQueryClient } from "@tanstack/react-query";
import { edgeInvoke, formatEdgeError } from "@/lib/edgeInvoke";
import { useToast } from "@/hooks/use-toast";

export function useDeleteUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return await edgeInvoke('delete_user', { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "User deleted",
        description: "User has been removed successfully",
      });
    },
    onError: (error: any) => {
      const errorMsg = formatEdgeError(error, 'delete_user');
      console.error('[useDeleteUser]', errorMsg);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });
}
