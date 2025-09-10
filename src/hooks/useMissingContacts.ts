import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MissingCandidate {
  id: number;
  full_name: string | null;
  email: string;
  organization: string | null;
  status: string;
  created_at: string;
}

interface UseMissingCandidatesParams {
  search?: string;
  status?: string;
  page: number;
  pageSize: number;
}

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

export function useMissingCandidates({
  search,
  status,
  page,
  pageSize,
}: UseMissingCandidatesParams) {
  console.log('useMissingCandidates called with:', { search, status, page, pageSize });
  return useQuery({
    queryKey: ["missing-candidates", { search, status, page, pageSize }],
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

      if (status) {
        params.append("status", `eq.${status}`);
      }

      // Apply pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const count = response.headers.get('content-range')?.split('/')[1] || '0';

      return {
        candidates: (data || []) as MissingCandidate[],
        totalCount: parseInt(count) || 0,
      };
    },
  });
}

export function useRefreshMissingContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)("refresh_missing_contacts", {
        p_exclude_domain: "lindsaygoldbergllc.com",
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missing-candidates"] });
    },
  });
}

export function useApproveMissingContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      contactData,
    }: {
      email: string;
      contactData: ContactData;
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

      return contactId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missing-candidates"] });
    },
  });
}

export function useDismissMissingContact() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["missing-candidates"] });
    },
  });
}