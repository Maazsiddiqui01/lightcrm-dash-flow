import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserListItem {
  id: string;
  email: string;
  full_name?: string;
}

export function useUsersList() {
  return useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list_users');
      
      if (error) throw error;
      
      return (data?.users || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email
      })) as UserListItem[];
    },
  });
}
