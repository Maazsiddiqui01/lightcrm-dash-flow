import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { mapRowToCandidate, MissingCandidate } from '@/types/missing-contacts';

interface ContactData {
  full_name?: string;
  email_address?: string;
  organization?: string;
  title?: string;
  lg_sector?: string;
  lg_focus_areas_comprehensive_list?: string;
  areas_of_specialization?: string;
  notes?: string;
}

export function useMissingCandidates(params: {
  search?: string;
  status?: string;
}) {
  const { search = '', status = 'all' } = params;

  return useQuery({
    queryKey: ['missing-contacts', { search, status }],
    queryFn: async () => {
      // Use direct API call since table isn't in generated types
      const SUPABASE_URL = "https://wjghdqkxwuyptxzdidtf.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ2hkcWt4d3V5cHR4emRpZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjA0NDEsImV4cCI6MjA3MTYzNjQ0MX0._zZEVM4XENutH8AxM_4Sh_DSGDGbFOTy6kC5-UGLFIs";
      
      let url = `${SUPABASE_URL}/rest/v1/contacts_missing_candidates?select=id,email,full_name,organization,status,created_at,updated_at&order=created_at.desc`;
      
      if (status !== 'all') {
        url += `&status=eq.${status}`;
      }

      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data || [];
    },
  });
}

export function useRefreshMissingContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('refresh_missing_contacts', { 
        exclude_domain: 'lindsaygoldbergllc.com' 
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
    }: {
      email: string;
      contactData?: ContactData;
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
        
        if (contactData.full_name && contactData.full_name !== contactData.email_address) {
          updateFields.full_name = contactData.full_name;
        }
        if (contactData.organization) updateFields.organization = contactData.organization;
        if (contactData.title) updateFields.title = contactData.title;
        if (contactData.lg_sector) updateFields.lg_sector = contactData.lg_sector;
        if (contactData.lg_focus_areas_comprehensive_list) {
          updateFields.lg_focus_areas_comprehensive_list = contactData.lg_focus_areas_comprehensive_list;
        }
        if (contactData.areas_of_specialization) {
          updateFields.areas_of_specialization = contactData.areas_of_specialization;
        }
        if (contactData.notes) updateFields.notes = contactData.notes;

        // Only update if there are additional fields to set
        if (Object.keys(updateFields).length > 0) {
          const { error: updateError } = await supabase
            .from("contacts_raw")
            .update(updateFields)
            .eq("id", contactId as string);

          if (updateError) {
            console.warn("Failed to update additional contact fields:", updateError);
            // Don't throw here since the main contact creation succeeded
          }
        }
      }

      return contactId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["missing-candidates"] });
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
      qc.invalidateQueries({ queryKey: ["missing-candidates"] });
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