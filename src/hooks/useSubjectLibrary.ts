import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
