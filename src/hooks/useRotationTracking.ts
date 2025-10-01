import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PhraseLibraryItem } from '@/types/phraseLibrary';
import type { InquiryLibraryItem } from './useInquiryLibrary';

interface LogPhraseUsageParams {
  contactId: string;
  phraseId: string;
  category: string;
}

interface LogInquiryUsageParams {
  contactId: string;
  inquiryId: string;
  category: string;
}

/**
 * Get available phrases for a contact that haven't been used recently
 */
export async function getAvailablePhrases(
  contactId: string,
  category: string,
  allPhrases: PhraseLibraryItem[]
): Promise<PhraseLibraryItem[]> {
  const { data: usedLogs } = await supabase
    .from('phrase_rotation_log' as any)
    .select('phrase_id')
    .eq('contact_id', contactId);
  
  const usedIds = new Set(usedLogs?.map((log: any) => log.phrase_id) || []);
  
  // Filter to category and exclude used
  const categoryPhrases = allPhrases.filter(p => p.category === category);
  let available = categoryPhrases.filter(p => !usedIds.has(p.id));
  
  // If all used, reset rotation for this category
  if (available.length === 0 && categoryPhrases.length > 0) {
    const categoryPhraseIds = categoryPhrases.map(p => p.id);
    await supabase
      .from('phrase_rotation_log' as any)
      .delete()
      .eq('contact_id', contactId)
      .in('phrase_id', categoryPhraseIds);
    
    available = categoryPhrases;
  }
  
  return available;
}

/**
 * Get available inquiries for a contact that haven't been used recently
 */
export async function getAvailableInquiries(
  contactId: string,
  category: string,
  allInquiries: InquiryLibraryItem[]
): Promise<InquiryLibraryItem[]> {
  const { data: usedLogs } = await supabase
    .from('inquiry_rotation_log' as any)
    .select('inquiry_id')
    .eq('contact_id', contactId);
  
  const usedIds = new Set(usedLogs?.map((log: any) => log.inquiry_id) || []);
  
  // Filter to category and exclude used
  const categoryInquiries = allInquiries.filter(i => i.category === category);
  let available = categoryInquiries.filter(i => !usedIds.has(i.id));
  
  // If all used, reset rotation for this category
  if (available.length === 0 && categoryInquiries.length > 0) {
    const categoryInquiryIds = categoryInquiries.map(i => i.id);
    await supabase
      .from('inquiry_rotation_log' as any)
      .delete()
      .eq('contact_id', contactId)
      .in('inquiry_id', categoryInquiryIds);
    
    available = categoryInquiries;
  }
  
  return available;
}

/**
 * Hook to log phrase usage for rotation tracking
 */
export function useLogPhraseUsage() {
  return useMutation({
    mutationFn: async ({ contactId, phraseId }: LogPhraseUsageParams) => {
      const { error } = await supabase
        .from('phrase_rotation_log' as any)
        .upsert({
          contact_id: contactId,
          phrase_id: phraseId,
          used_at: new Date().toISOString()
        }, {
          onConflict: 'contact_id,phrase_id'
        });
      
      if (error) throw error;
    },
  });
}

/**
 * Hook to log inquiry usage for rotation tracking
 */
export function useLogInquiryUsage() {
  return useMutation({
    mutationFn: async ({ contactId, inquiryId }: LogInquiryUsageParams) => {
      const { error } = await supabase
        .from('inquiry_rotation_log' as any)
        .upsert({
          contact_id: contactId,
          inquiry_id: inquiryId,
          used_at: new Date().toISOString()
        }, {
          onConflict: 'contact_id,inquiry_id'
        });
      
      if (error) throw error;
    },
  });
}
