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
  status?: ('pending'|'approved'|'dismissed')[] | string;
  domain?: string;
  page?: number;
  pageSize?: number;
}) {
  const { search = '', status = ['pending'], domain = '', page = 1, pageSize = 25 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    queryKey: ['missing-candidates', { search, status, domain, page, pageSize }],
    queryFn: async () => {
      // Use direct fetch since this table isn't in the generated types yet
      const SUPABASE_URL = "https://wjghdqkxwuyptxzdidtf.supabase.co";
      const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ2hkcWt4d3V5cHR4emRpZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjA0NDEsImV4cCI6MjA3MTYzNjQ0MX0._zZEVM4XENutH8AxM_4Sh_DSGDGbFOTy6kC5-UGLFIs";
      
      let url = `${SUPABASE_URL}/rest/v1/contacts_missing_candidates?select=*`;
      
      const params = new URLSearchParams();
      
      // Apply filters
      if (search) {
        params.append("or", `email.ilike.%${search}%,full_name.ilike.%${search}%,organization.ilike.%${search}%`);
      }

      // Handle legacy single status string or new array format
      if (typeof status === 'string' && status !== 'all') {
        params.append("status", `eq.${status}`);
      } else if (Array.isArray(status) && status.length) {
        status.forEach(s => params.append("status", `eq.${s}`));
      }
      
      if (domain) {
        params.append("organization", `ilike.%${domain}%`);
      }

      // Apply pagination
      params.append("offset", from.toString());
      params.append("limit", pageSize.toString());

      // Order by created_at desc
      params.append("order", "created_at.desc");

      if (params.toString()) {
        url += `&${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'authorization': `Bearer ${SUPABASE_KEY}`,
          'prefer': 'count=exact',
        },
      });

      if (!response.ok) {
        const message = `HTTP error! status: ${response.status}`;
        console.error('Load candidates error', message);
        toast({ title: 'Failed to load candidates', description: message, variant: 'destructive' });
        throw new Error(message);
      }

      const data = await response.json();
      const count = response.headers.get('content-range')?.split('/')[1] || '0';
      
      const rows = (data || []).map(mapRowToCandidate);
      return { 
        candidates: rows, 
        rows, 
        totalCount: parseInt(count) || rows.length,
        count: parseInt(count) || rows.length 
      };
    },
  });
}

export function useRefreshMissingContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('refresh_missing_contacts', { p_exclude_domain: 'lindsaygoldbergllc.com' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missing-candidates'] });
      toast({ title: 'Refreshed', description: 'Staged contacts were updated.' });
    },
    onError: (e: any) => {
      toast({ title: 'Refresh failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
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
      qc.invalidateQueries({ queryKey: ['missing-candidates'] });
      toast({ title: 'Contact approved', description: 'Added to Contacts.' });
    },
    onError: (e: any) => {
      toast({ title: 'Approve failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
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
      qc.invalidateQueries({ queryKey: ['missing-candidates'] });
      toast({ title: 'Dismissed', description: 'Candidate was dismissed.' });
    },
    onError: (e: any) => {
      toast({ title: 'Dismiss failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    },
  });
}