import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PhraseRotationLog {
  id: string;
  contact_id: string;
  phrase_id: string;
  category: string;
  used_at: string;
}

interface InquiryRotationLog {
  id: string;
  contact_id: string;
  inquiry_id: string;
  category: string;
  used_at: string;
}

export function useContactPhraseHistory(contactId: string, category?: string) {
  return useQuery({
    queryKey: ['phrase-rotation', contactId, category],
    queryFn: async () => {
      let query = supabase
        .from('phrase_rotation_log' as any)
        .select('*')
        .eq('contact_id', contactId)
        .order('used_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PhraseRotationLog[];
    },
    enabled: !!contactId,
  });
}

export function useContactInquiryHistory(contactId: string, category?: string) {
  return useQuery({
    queryKey: ['inquiry-rotation', contactId, category],
    queryFn: async () => {
      let query = supabase
        .from('inquiry_rotation_log' as any)
        .select('*')
        .eq('contact_id', contactId)
        .order('used_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as InquiryRotationLog[];
    },
    enabled: !!contactId,
  });
}

export function useLogPhraseUsage() {
  return useMutation({
    mutationFn: async (params: { contactId: string; phraseId: string; category: string }) => {
      const { error } = await supabase
        .from('phrase_rotation_log' as any)
        .insert({
          contact_id: params.contactId,
          phrase_id: params.phraseId,
          category: params.category,
        });

      if (error) throw error;
    },
  });
}

export function useLogInquiryUsage() {
  return useMutation({
    mutationFn: async (params: { contactId: string; inquiryId: string; category: string }) => {
      const { error } = await supabase
        .from('inquiry_rotation_log' as any)
        .insert({
          contact_id: params.contactId,
          inquiry_id: params.inquiryId,
          category: params.category,
        });

      if (error) throw error;
    },
  });
}

/**
 * Get phrases that haven't been used for this contact in a specific category
 */
export async function getAvailablePhrases(
  contactId: string,
  category: string,
  allPhrases: any[]
): Promise<any[]> {
  const { data: usedPhrases, error } = await supabase
    .from('phrase_rotation_log' as any)
    .select('phrase_id')
    .eq('contact_id', contactId)
    .eq('category', category);

  if (error) throw error;

  const usedIds = new Set((usedPhrases || []).map((p: any) => p.phrase_id));
  const available = allPhrases.filter(p => !usedIds.has(p.id));

  // If all have been used, reset and return all
  return available.length > 0 ? available : allPhrases;
}

/**
 * Get inquiries that haven't been used for this contact in a specific category
 */
export async function getAvailableInquiries(
  contactId: string,
  category: string,
  allInquiries: any[]
): Promise<any[]> {
  const { data: usedInquiries, error } = await supabase
    .from('inquiry_rotation_log' as any)
    .select('inquiry_id')
    .eq('contact_id', contactId)
    .eq('category', category);

  if (error) throw error;

  const usedIds = new Set((usedInquiries || []).map((i: any) => i.inquiry_id));
  const available = allInquiries.filter(i => !usedIds.has(i.id));

  // If all have been used, reset and return all
  return available.length > 0 ? available : allInquiries;
}