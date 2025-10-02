import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GroupMember {
  email: string;
  name?: string;
  contactId?: string;
  organization?: string;
}

export interface GroupSuggestion {
  id: string;
  suggestedName: string;
  members: GroupMember[];
  interactionCount: number;
  lastInteraction: string;
  firstInteraction: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  sharedOrganization?: string;
  sampleSubjects: string[];
}

export function useSuggestGroups() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('suggest_contact_groups');
      
      if (error) throw error;
      return data.suggestions as GroupSuggestion[];
    },
    onError: (error) => {
      console.error('Error suggesting groups:', error);
      toast.error('Failed to analyze groups. Please try again.');
    },
  });
}

export function useCreateGroupFromSuggestion() {
  return useMutation({
    mutationFn: async ({ 
      groupName, 
      memberEmails 
    }: { 
      groupName: string; 
      memberEmails: string[] 
    }) => {
      // Update all existing contacts with this group
      const { data: contacts } = await supabase
        .from('contacts_raw')
        .select('id, email_address')
        .in('email_address', memberEmails);

      if (!contacts || contacts.length === 0) {
        throw new Error('No matching contacts found');
      }

      const contactIds = contacts.map(c => c.id);
      
      const { error } = await supabase
        .from('contacts_raw')
        .update({ group_contact: groupName })
        .in('id', contactIds);

      if (error) throw error;

      return { 
        updatedCount: contactIds.length,
        missingCount: memberEmails.length - contactIds.length 
      };
    },
    onSuccess: ({ updatedCount, missingCount }) => {
      if (missingCount > 0) {
        toast.success(
          `Group created with ${updatedCount} contacts. ${missingCount} member(s) not found in contacts.`
        );
      } else {
        toast.success(`Group created successfully with ${updatedCount} members!`);
      }
    },
    onError: (error) => {
      console.error('Error creating group:', error);
      toast.error('Failed to create group. Please try again.');
    },
  });
}
