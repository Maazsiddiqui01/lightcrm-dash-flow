import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSafeUpdate } from '@/utils/databaseUpdateHelpers';

export interface ContactEmail {
  id: string;
  contact_id: string;
  email_address: string;
  email_type: 'primary' | 'work' | 'personal' | 'alternate';
  is_primary: boolean;
  verified: boolean;
  source: string | null;
  added_at: string;
  added_by: string | null;
}

export function useContactEmails(contactId: string | null | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all email addresses for a contact
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['contact-emails', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('contact_email_addresses')
        .select('*')
        .eq('contact_id', contactId)
        .order('is_primary', { ascending: false })
        .order('added_at', { ascending: true });

      if (error) throw error;
      return data as ContactEmail[];
    },
    enabled: !!contactId,
  });

  // Add email mutation
  const addEmailMutation = useMutation({
    mutationFn: async ({ email, type }: { email: string; type: ContactEmail['email_type'] }) => {
      if (!contactId) throw new Error('No contact ID');

      const { data, error } = await supabase
        .from('contact_email_addresses')
        .insert({
          contact_id: contactId,
          email_address: email.toLowerCase(),
          email_type: type,
          is_primary: false,
          source: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-emails', contactId] });
      toast({
        title: 'Success',
        description: 'Email address added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add email address',
        variant: 'destructive',
      });
    },
  });

  // Set as primary mutation
  const setAsPrimaryMutation = useMutation({
    mutationFn: async (emailId: string) => {
      if (!contactId) throw new Error('No contact ID');

      const email = emails.find(e => e.id === emailId);
      if (!email) throw new Error('Email not found');

      // Validate email address is not null/empty
      if (!email.email_address || email.email_address.trim() === '') {
        throw new Error('Email address cannot be empty');
      }

      // First, unset any existing primary email for this contact
      const { error: unsetError } = await supabase
        .from('contact_email_addresses')
        .update({ is_primary: false })
        .eq('contact_id', contactId)
        .eq('is_primary', true);

      if (unsetError) {
        console.error('[DB Error]', {
          operation: 'unset_previous_primary_email',
          table: 'contact_email_addresses',
          error: unsetError,
          contactId,
        });
        throw unsetError;
      }

      // Update the selected email to be primary
      const { error: updateError } = await supabase
        .from('contact_email_addresses')
        .update({ is_primary: true })
        .eq('id', emailId);

      if (updateError) {
        console.error('[DB Error]', {
          operation: 'set_email_primary',
          table: 'contact_email_addresses',
          error: updateError,
          emailId,
        });
        throw updateError;
      }

      // Update contacts_raw to reflect the new primary email (using safe update)
      const safeUpdate = getSafeUpdate('contacts_raw', { 
        email_address: email.email_address.trim().toLowerCase() 
      });

      const { error: contactError } = await supabase
        .from('contacts_raw')
        .update(safeUpdate)
        .eq('id', contactId);

      if (contactError) {
        console.error('[DB Error]', {
          operation: 'set_primary_email_on_contact',
          table: 'contacts_raw',
          error: contactError,
          contactId,
          emailId,
        });
        throw contactError;
      }

      return email.email_address;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-emails', contactId] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Success',
        description: 'Primary email updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set primary email',
        variant: 'destructive',
      });
    },
  });

  // Delete email mutation
  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const email = emails.find(e => e.id === emailId);
      if (email?.is_primary) {
        throw new Error('Cannot delete primary email');
      }

      const { error } = await supabase
        .from('contact_email_addresses')
        .delete()
        .eq('id', emailId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-emails', contactId] });
      toast({
        title: 'Success',
        description: 'Email address deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete email address',
        variant: 'destructive',
      });
    },
  });

  return {
    emails,
    isLoading,
    addEmail: addEmailMutation.mutate,
    setAsPrimary: setAsPrimaryMutation.mutate,
    deleteEmail: deleteEmailMutation.mutate,
    isAdding: addEmailMutation.isPending,
    isSettingPrimary: setAsPrimaryMutation.isPending,
    isDeleting: deleteEmailMutation.isPending,
  };
}
