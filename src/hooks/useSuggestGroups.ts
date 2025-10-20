import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SuggestionMode = 'org_sector' | 'interaction';

export interface GroupMember {
  email: string;
  name?: string;
  contactId?: string;
  organization?: string;
  focusAreas?: string[];
}

export interface GroupSuggestion {
  id: string;
  suggestedName: string;
  members: GroupMember[];
  
  // For interaction mode
  interactionCount?: number;
  lastInteraction?: string;
  firstInteraction?: string;
  score?: number;
  sampleSubjects?: string[];
  
  // For org/sector mode
  organization?: string;
  sector?: string;
  domain?: string;
  memberCount?: number;
  
  confidence: 'high' | 'medium' | 'low';
  sharedOrganization?: string;
}

export interface GroupConflict {
  email: string;
  name?: string;
  currentGroup: string;
  suggestedGroup: string;
}

export function useSuggestGroups(mode: SuggestionMode = 'org_sector') {
  return useMutation({
    mutationFn: async () => {
      const functionName = mode === 'org_sector' 
        ? 'suggest_groups_by_org_sector'
        : 'suggest_contact_groups';
      
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;
      return data.suggestions as GroupSuggestion[];
    },
    onError: (error) => {
      console.error('Error suggesting groups:', error);
      toast.error('Failed to analyze groups. Please try again.');
    },
  });
}

export function useCheckGroupConflicts() {
  return useMutation({
    mutationFn: async ({ 
      groupName, 
      memberEmails 
    }: { 
      groupName: string; 
      memberEmails: string[] 
    }) => {
      // Check if group name already exists
      const { data: existingGroups } = await supabase
        .from('contacts_raw')
        .select('group_contact')
        .eq('group_contact', groupName)
        .limit(1);

      let finalGroupName = groupName;
      if (existingGroups && existingGroups.length > 0) {
        // Find unique name
        let counter = 2;
        while (true) {
          const testName = `${groupName} (${counter})`;
          const { data: test } = await supabase
            .from('contacts_raw')
            .select('group_contact')
            .eq('group_contact', testName)
            .limit(1);
          
          if (!test || test.length === 0) {
            finalGroupName = testName;
            break;
          }
          counter++;
          if (counter > 10) break; // Safety limit
        }
      }

      // Check for contacts already in groups
      const { data: contacts } = await supabase
        .from('contacts_raw')
        .select('id, email_address, full_name, group_contact')
        .in('email_address', memberEmails);

      if (!contacts || contacts.length === 0) {
        throw new Error('No matching contacts found');
      }

      const conflicts: GroupConflict[] = contacts
        .filter(c => c.group_contact && c.group_contact.trim() !== '')
        .map(c => ({
          email: c.email_address!,
          name: c.full_name,
          currentGroup: c.group_contact!,
          suggestedGroup: finalGroupName
        }));

      return {
        finalGroupName,
        conflicts,
        validContacts: contacts.filter(c => !c.group_contact || c.group_contact.trim() === ''),
        allContacts: contacts
      };
    },
    onError: (error) => {
      console.error('Error checking conflicts:', error);
      toast.error('Failed to check for conflicts. Please try again.');
    },
  });
}

// This hook is deprecated - group creation now goes through the configuration modal
// which creates entries in the groups table and contact_group_memberships table
export function useCreateGroupFromSuggestion() {
  return useMutation({
    mutationFn: async ({ 
      groupName, 
      contactIds 
    }: { 
      groupName: string; 
      contactIds: string[] 
    }) => {
      if (contactIds.length === 0) {
        throw new Error('No contacts selected');
      }

      // Update only the selected contacts
      const { error } = await supabase
        .from('contacts_raw')
        .update({ group_contact: groupName })
        .in('id', contactIds);

      if (error) throw error;

      return { updatedCount: contactIds.length };
    },
    onSuccess: ({ updatedCount }) => {
      toast.success(`Group created successfully with ${updatedCount} members!`);
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      toast.error('Failed to create group. Please try again.');
    },
  });
}
