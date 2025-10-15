import { useMutation, useQueryClient } from "@tanstack/react-query";
import { edgeInvoke, formatEdgeError } from "@/lib/edgeInvoke";
import { useToast } from "@/hooks/use-toast";

interface InviteUserParams {
  email: string;
  full_name: string;
}

export function useInviteUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, full_name }: InviteUserParams) => {
      return await edgeInvoke('invite_user', { email, full_name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: "Invitation sent",
        description: "User will receive an email to set their password",
      });
    },
    onError: (error: any) => {
      const errorMsg = formatEdgeError(error, 'invite_user');
      console.error('[useInviteUser]', errorMsg);
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive",
      });
    },
  });
}
