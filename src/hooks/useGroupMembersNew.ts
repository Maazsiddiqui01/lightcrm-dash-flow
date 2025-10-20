import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GroupMemberInfo } from '@/types/group';

export function useGroupMembersNew(groupId: string | null) {
  return useQuery({
    queryKey: ['group-members-new', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data, error } = await supabase.rpc('get_group_members', {
        p_group_id: groupId
      });

      if (error) throw error;
      return data as GroupMemberInfo[];
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
