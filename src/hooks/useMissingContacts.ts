import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MissingContactsArraySchema, type MissingContact } from '@/types/missingContacts';
import { getSafeUpdate, validateUpdate } from '@/utils/databaseUpdateHelpers';

interface ContactData {
  full_name?: string;
  email_address?: string;
  organization?: string;
  title?: string;
  lg_sector?: string;
  lg_focus_areas_comprehensive_list?: string;
  lg_focus_areas?: string[];
  areas_of_specialization?: string;
  notes?: string;
  phone?: string;
  linkedin_url?: string;
  x_twitter_url?: string;
  url_to_online_bio?: string;
  category?: string;
  lg_lead?: string;
  lg_assistant?: string;
  delta_type?: string;
  delta?: string;
}

export function useMissingCandidates(params: {
  search?: string;
  status?: string;
}) {
  const { search = '', status = 'all' } = params;

  return useQuery({
    queryKey: ['missing-contacts', { search, status }],
    queryFn: async (): Promise<MissingContact[]> => {
      const { data, error } = await (supabase.from as any)('contacts_missing_candidates')
        .select('id, full_name, email, organization, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Validate with zod
      const parsed = MissingContactsArraySchema.safeParse(data);
      if (!parsed.success) {
        console.error('Data validation failed:', parsed.error.flatten());
        throw new Error('Invalid data shape for contacts_missing_candidates');
      }
      
      // Debug: Show actual data shape
      console.table(parsed.data?.slice(0,3));
      console.log('Raw data keys:', Object.keys(parsed.data?.[0] || {}));
      
      return parsed.data;
    },
  });
}

export function useRefreshMissingContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('refresh_missing_contacts', { 
        p_exclude_domain: 'lindsaygoldbergllc.com' 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missing-contacts'] });
    },
    onError: (e: any) => {
      throw e;
    },
  });
}

export function useApproveMissingContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      contactData,
      groupId,
      emailRole,
    }: {
      email: string;
      contactData?: ContactData;
      groupId?: string | null;
      emailRole?: 'to' | 'cc' | 'bcc';
    }) => {
      // Step 1: Call the approve RPC which creates the contact and updates status
      const { data: contactId, error: approveError } = await (supabase.rpc as any)(
        "approve_missing_contact",
        { p_email: email }
      );

      if (approveError) {
        throw new Error(approveError.message);
      }

      if (!contactId) {
        throw new Error("Failed to create contact");
      }

      // Step 2: Update the contact with additional fields if provided
      if (contactData) {
        const updateFields: any = {};
        
        // Handle focus areas conversion
        if (contactData.lg_focus_areas && contactData.lg_focus_areas.length > 0) {
          updateFields.lg_focus_areas_comprehensive_list = contactData.lg_focus_areas.join(', ');
          // Individual slots
          for (let i = 0; i < 8; i++) {
            updateFields[`lg_focus_area_${i + 1}`] = contactData.lg_focus_areas[i] || null;
          }
        }
        
        if (contactData.full_name && contactData.full_name !== contactData.email_address) {
          updateFields.full_name = contactData.full_name;
        }
        if (contactData.organization) updateFields.organization = contactData.organization;
        if (contactData.title) updateFields.title = contactData.title;
        if (contactData.lg_sector) updateFields.lg_sector = contactData.lg_sector;
        if (contactData.areas_of_specialization) {
          updateFields.areas_of_specialization = contactData.areas_of_specialization;
        }
        if (contactData.notes) updateFields.notes = contactData.notes;
        if (contactData.phone) updateFields.phone = contactData.phone;
        if (contactData.linkedin_url) updateFields.linkedin_url = contactData.linkedin_url;
        if (contactData.x_twitter_url) updateFields.x_twitter_url = contactData.x_twitter_url;
        if (contactData.url_to_online_bio) updateFields.url_to_online_bio = contactData.url_to_online_bio;
        if (contactData.category) updateFields.category = contactData.category;
        if (contactData.lg_lead) updateFields.lg_lead = contactData.lg_lead;
        if (contactData.lg_assistant) updateFields.lg_assistant = contactData.lg_assistant;
        if (contactData.delta_type) updateFields.delta_type = contactData.delta_type;
        if (contactData.delta) updateFields.delta = parseInt(contactData.delta);

        // Only update if there are additional fields to set
        if (Object.keys(updateFields).length > 0) {
          // Validate and filter fields using safe update helpers
          const safeUpdate = getSafeUpdate('contacts_raw', updateFields);
          const validation = validateUpdate('contacts_raw', safeUpdate);
          
          if (!validation.valid) {
            console.warn('[Validation] Invalid fields detected:', validation.violations);
            throw new Error(`Cannot update forbidden fields: ${validation.violations.join(', ')}`);
          }
          
          const { error: updateError } = await supabase
            .from("contacts_raw")
            .update(safeUpdate)
            .eq("id", contactId as string);

          if (updateError) {
            console.error('[DB Error]', {
              operation: 'approve_missing_contact_update',
              table: 'contacts_raw',
              error: updateError,
              contactId,
            });
            console.warn("Failed to update additional contact fields:", updateError);
            // Don't throw here since the main contact creation succeeded
          }
        }
      }

      // Step 3: Add to group if specified
      if (groupId) {
        const { error: membershipError } = await supabase
          .from('contact_group_memberships')
          .insert({
            contact_id: contactId,
            group_id: groupId,
            email_role: emailRole || 'to',
          });

        if (membershipError) {
          console.error('Failed to add to group:', membershipError);
          // Don't throw - contact was created successfully
        }
      }

      return contactId;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["missing-contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      if (variables.groupId) {
        qc.invalidateQueries({ queryKey: ['groups'] });
        qc.invalidateQueries({ queryKey: ['group-members-new', variables.groupId] });
        qc.invalidateQueries({ queryKey: ['contact-groups'] });
      }
      toast({ title: 'Contact approved', description: 'Added to Contacts.' });
    },
    onError: (e: any) => {
      toast({ title: 'Approve failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    },
  });
}

export function useApproveMissing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await (supabase.rpc as any)('approve_missing_contact', { p_email: email });
      if (error) throw error;
      return data as string | null; // new contact id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missing-contacts'] });
      qc.invalidateQueries({ queryKey: ["contacts"] }); // Refresh contacts table
    },
    onError: (e: any) => {
      throw e;
    },
  });
}

export function useDismissMissingContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await (supabase.rpc as any)("dismiss_missing_contact", {
        p_email: email,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missing-contacts"] });
      toast({ title: 'Dismissed', description: 'Candidate was dismissed.' });
    },
    onError: (e: any) => {
      toast({ title: 'Dismiss failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    },
  });
}

export function useDismissMissing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await (supabase.rpc as any)('dismiss_missing_contact', { p_email: email });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missing-contacts'] });
    },
    onError: (e: any) => {
      throw e;
    },
  });
}