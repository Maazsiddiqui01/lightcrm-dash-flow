import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubjectLibraryItem {
  id: string;
  style: 'formal' | 'hybrid' | 'casual';
  subject_template: string;
  is_global: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubjectLibrary(style?: 'formal' | 'hybrid' | 'casual') {
  return useQuery({
    queryKey: ['subject-library', style],
    queryFn: async () => {
      let query = supabase
        .from('subject_library' as any)
        .select('*')
        .eq('is_global', true);

      if (style) {
        query = query.eq('style', style);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as SubjectLibraryItem[];
    },
  });
}

/**
 * Select a random subject from the library for a given style
 */
export function selectSubject(
  subjects: SubjectLibraryItem[],
  focusAreas: string[]
): string {
  if (subjects.length === 0) {
    return focusAreas.length > 0 
      ? `Re: ${focusAreas[0]}` 
      : 'Following Up';
  }

  const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
  let subject = randomSubject.subject_template;

  // Replace [Focus Area] placeholder with first focus area
  if (focusAreas.length > 0) {
    subject = subject.replace(/\[Focus Area\]/g, focusAreas[0]);
  }

  return subject;
}

/**
 * Pick subject with token replacement and optional rotation
 */
export async function pickSubject({
  tone,
  org,
  focusAreas,
  sector,
  subjects,
}: {
  tone: 'formal' | 'hybrid' | 'casual';
  org: string;
  focusAreas: string[];
  sector?: string;
  subjects: SubjectLibraryItem[];
}): Promise<string> {
  // Filter by tone
  const pool = subjects.filter(s => s.style === tone);
  
  if (pool.length === 0) {
    return focusAreas.length > 0 ? `Re: ${focusAreas[0]}` : 'Following Up';
  }

  // Pick random
  const selected = pool[Math.floor(Math.random() * pool.length)];
  let subject = selected.subject_template;

  // Handle (no subject) marker
  if (subject.toLowerCase() === '(no subject)') {
    return '';
  }

  // Token replacement
  subject = subject.replace(/\[My Org\]/g, 'Lindsay Goldberg');
  subject = subject.replace(/\[Their Org\]/g, org || '[Organization]');
  subject = subject.replace(/\[Focus Area\]/g, focusAreas.length > 0 ? focusAreas[0] : '[Focus Area]');
  
  // Sector replacement
  if (sector) {
    subject = subject.replace(/\[Sector\]/g, sector);
  } else if (focusAreas.length > 0) {
    // Try to extract unique sectors from focus areas if available
    const sectors = [...new Set(focusAreas.map(fa => fa.split(':')[0]).filter(Boolean))];
    subject = subject.replace(/\[Sector\]/g, sectors.length > 0 ? sectors.join(', ') : '[Sector]');
  }

  return subject;
}

/**
 * Create a new subject in the library
 */
export function useCreateSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (newSubject: {
      subject_template: string;
      style: 'formal' | 'hybrid' | 'casual';
    }) => {
      const { data, error } = await supabase
        .from('subject_library' as any)
        .insert({
          subject_template: newSubject.subject_template,
          style: newSubject.style,
          is_global: true,
          template_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-library'] });
      toast({
        title: "Subject created",
        description: "New subject line added to library",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create subject",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Update an existing subject in the library
 */
export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      subject_template?: string;
      style?: 'formal' | 'hybrid' | 'casual';
    }) => {
      const updates: any = {};
      if (params.subject_template !== undefined) {
        updates.subject_template = params.subject_template;
      }
      if (params.style !== undefined) {
        updates.style = params.style;
      }

      const { data, error } = await supabase
        .from('subject_library' as any)
        .update(updates)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-library'] });
      toast({
        title: "Subject updated",
        description: "Subject line has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update subject",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Delete a subject from the library
 */
export function useDeleteSubject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subject_library' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subject-library'] });
      toast({
        title: "Subject deleted",
        description: "Subject line removed from library",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete subject",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
