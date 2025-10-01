import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type InquiryCategory = 'opportunity' | 'article' | 'focus_area' | 'generic';
export type TriState = 'always' | 'sometimes' | 'never';

export interface InquiryLibraryItem {
  id: string;
  category: InquiryCategory;
  inquiry_text: string;
  tri_state: TriState;
  is_global: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useInquiryLibrary(templateId?: string | null, category?: InquiryCategory) {
  return useQuery({
    queryKey: ['inquiry-library', templateId, category],
    queryFn: async () => {
      let query = supabase
        .from('inquiry_library' as any)
        .select('*')
        .order('created_at', { ascending: true });

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as InquiryLibraryItem[];
    },
    enabled: templateId !== undefined || category !== undefined,
  });
}

export function useGlobalInquiries(category?: InquiryCategory) {
  return useQuery({
    queryKey: ['inquiry-library', 'global', category],
    queryFn: async () => {
      let query = supabase
        .from('inquiry_library' as any)
        .select('*')
        .eq('is_global', true)
        .order('category', { ascending: true })
        .order('created_at', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as InquiryLibraryItem[];
    },
  });
}

export function useCreateInquiry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inquiry: Omit<InquiryLibraryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('inquiry_library' as any)
        .insert(inquiry as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry-library'] });
      toast({
        title: 'Inquiry added',
        description: 'The inquiry has been added to the library',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding inquiry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInquiry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InquiryLibraryItem> }) => {
      const { data, error } = await supabase
        .from('inquiry_library' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry-library'] });
      toast({
        title: 'Inquiry updated',
        description: 'The inquiry has been updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating inquiry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInquiry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inquiry_library' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry-library'] });
      toast({
        title: 'Inquiry deleted',
        description: 'The inquiry has been removed from the library',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting inquiry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Get available inquiries with template + global filtering
 */
export async function getAvailableInquiries({
  templateId,
  includeGlobal = true,
  activeOnly = true,
}: {
  templateId?: string | null;
  includeGlobal?: boolean;
  activeOnly?: boolean;
}) {
  let query = supabase
    .from('inquiry_library' as any)
    .select('*');

  if (includeGlobal && templateId) {
    query = query.or(`is_global.eq.true,template_id.eq.${templateId}`);
  } else if (includeGlobal) {
    query = query.eq('is_global', true);
  } else if (templateId) {
    query = query.eq('template_id', templateId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const inquiries = data as unknown as InquiryLibraryItem[];
  
  // Group by category
  const grouped = inquiries.reduce((acc, inquiry) => {
    if (!acc[inquiry.category]) {
      acc[inquiry.category] = [];
    }
    acc[inquiry.category].push(inquiry);
    return acc;
  }, {} as Record<InquiryCategory, InquiryLibraryItem[]>);

  return grouped;
}

/**
 * Pick inquiry with priority system and rotation avoidance
 * Priority: opportunity → article → focus_area → generic
 */
export async function pickInquiry({
  contactId,
  hasOpps,
  articleChosen,
  focusAreas,
  allInquiries,
}: {
  contactId: string;
  hasOpps: boolean;
  articleChosen: boolean;
  focusAreas: string[];
  allInquiries: InquiryLibraryItem[];
}): Promise<{ id: string; text: string; category: InquiryCategory } | null> {
  const priorityOrder: InquiryCategory[] = ['opportunity', 'article', 'focus_area', 'generic'];

  for (const category of priorityOrder) {
    // Check if category is applicable
    if (category === 'opportunity' && !hasOpps) continue;
    if (category === 'article' && !articleChosen) continue;
    if (category === 'focus_area' && focusAreas.length === 0) continue;

    // Get category inquiries
    const categoryInquiries = allInquiries.filter(i => i.category === category);
    if (categoryInquiries.length === 0) continue;

    // Get recent usage for this contact (last 10)
    const { data: recentUse } = await supabase
      .from('inquiry_rotation_log' as any)
      .select('inquiry_id')
      .eq('contact_id', contactId)
      .order('used_at', { ascending: false })
      .limit(10);

    const recentIds = new Set(recentUse?.map((r: any) => r.inquiry_id) || []);

    // Filter out recently used
    const available = categoryInquiries.filter(i => !recentIds.has(i.id));

    if (available.length > 0) {
      const selected = available[Math.floor(Math.random() * available.length)];
      return {
        id: selected.id,
        text: selected.inquiry_text,
        category: selected.category,
      };
    }

    // If all used, reset and pick from all
    if (categoryInquiries.length > 0) {
      const selected = categoryInquiries[Math.floor(Math.random() * categoryInquiries.length)];
      return {
        id: selected.id,
        text: selected.inquiry_text,
        category: selected.category,
      };
    }
  }

  return null;
}

/**
 * Log inquiry usage for rotation tracking
 */
export async function logInquiryUse({
  contactId,
  inquiryId,
}: {
  contactId: string;
  inquiryId: string;
}): Promise<void> {
  const { error } = await supabase
    .from('inquiry_rotation_log' as any)
    .insert({
      contact_id: contactId,
      inquiry_id: inquiryId,
      used_at: new Date().toISOString(),
    });

  if (error) throw error;
}