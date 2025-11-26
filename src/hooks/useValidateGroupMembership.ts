import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ValidateGroupMembershipParams {
  contactId: string;
  newGroupId: string;
}

interface GroupInfo {
  max_lag_days: number | null;
  name: string;
}

export function useValidateGroupMembership() {
  return useMutation({
    mutationFn: async ({ contactId, newGroupId }: ValidateGroupMembershipParams) => {
      // Get contact's existing group memberships
      const { data: existingMemberships, error: membershipsError } = await supabase
        .from('contact_group_memberships')
        .select(`
          group_id,
          groups!inner(
            id,
            name,
            max_lag_days
          )
        `)
        .eq('contact_id', contactId);
      
      if (membershipsError) throw membershipsError;
      
      // Get new group's max_lag_days
      const { data: newGroup, error: newGroupError } = await supabase
        .from('groups')
        .select('id, name, max_lag_days')
        .eq('id', newGroupId)
        .maybeSingle();
      
      if (newGroupError) throw newGroupError;
      if (!newGroup) throw new Error('Group not found');
      
      // Check for conflicts in max_lag_days
      if (existingMemberships && existingMemberships.length > 0) {
        const conflicts = existingMemberships.filter((membership: any) => {
          const existingMaxLag = membership.groups?.max_lag_days;
          return existingMaxLag !== null && 
                 newGroup.max_lag_days !== null && 
                 existingMaxLag !== newGroup.max_lag_days;
        });
        
        if (conflicts.length > 0) {
          const conflictGroup = conflicts[0].groups;
          throw new Error(
            `Cannot add to group "${newGroup.name}": Conflicting max_lag_days. ` +
            `Contact's existing group "${conflictGroup.name}" has ${conflictGroup.max_lag_days} days, ` +
            `but "${newGroup.name}" has ${newGroup.max_lag_days} days.`
          );
        }
      }
      
      return { valid: true, newGroup };
    }
  });
}
