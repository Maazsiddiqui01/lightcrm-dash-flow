// LEGACY FILE - Subjects are now unified into phrase_library
// This file provides backwards compatibility during the transition

import { usePhraseLibrary } from './usePhraseLibrary';
import type { PhraseLibraryItem } from '@/types/phraseLibrary';

// Subject type for backwards compatibility
export interface SubjectLibraryItem {
  id: string;
  subject_template: string;
  style: 'formal' | 'hybrid' | 'casual';
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

// Convert phrase to subject format for backwards compat
function phraseToSubject(phrase: PhraseLibraryItem): SubjectLibraryItem {
  return {
    id: phrase.id,
    subject_template: phrase.phrase_text,
    style: (phrase as any).style || 'hybrid',
    is_global: phrase.is_global,
    created_at: phrase.created_at,
    updated_at: phrase.updated_at,
  };
}

/**
 * @deprecated Use usePhraseLibrary with category='subject' instead
 */
export function useSubjectLibrary(style?: 'formal' | 'hybrid' | 'casual') {
  const { data: phrases = [], ...rest } = usePhraseLibrary(null, 'subject');
  
  // Filter by style if provided
  const filteredPhrases = style
    ? phrases.filter(p => (p as any).style === style)
    : phrases;
  
  // Convert to subject format
  const subjects = filteredPhrases.map(phraseToSubject);
  
  return { data: subjects, ...rest };
}

/**
 * @deprecated Subjects are now part of phrase_library with random selection
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
  const filtered = subjects.filter(s => s.style === tone);
  const pool = filtered.length > 0 ? filtered : subjects;
  
  if (pool.length === 0) return `RE: ${focusAreas[0] || 'Discussion'}`;
  
  // Pick random subject
  const subject = pool[Math.floor(Math.random() * pool.length)];
  let result = subject.subject_template;
  
  // Replace tokens
  result = result.replace(/\[My Org\]/g, org || 'Our Team');
  result = result.replace(/\[Their Org\]/g, 'Your Organization');
  result = result.replace(/\[Focus Area\]/g, focusAreas[0] || 'Our Discussion');
  result = result.replace(/\[Sector\]/g, sector || 'Industry');
  
  return result;
}

/**
 * @deprecated Use useCreatePhrase with category='subject' instead
 */
export function useCreateSubject() {
  throw new Error('useCreateSubject is deprecated. Subjects are now created via InlinePhraseForm');
}

/**
 * @deprecated Use useUpdatePhrase instead
 */
export function useUpdateSubject() {
  throw new Error('useUpdateSubject is deprecated. Subjects are now updated via InlinePhraseForm');
}

/**
 * @deprecated Use useDeletePhrase instead
 */
export function useDeleteSubject() {
  throw new Error('useDeleteSubject is deprecated. Subjects are now deleted via PhraseSelectorGeneric');
}

/**
 * @deprecated Use getAvailablePhrases with category='subject' instead
 */
export function selectSubject(subjects: SubjectLibraryItem[], focusAreas: string[]): string {
  if (subjects.length === 0) return `RE: ${focusAreas[0] || 'Discussion'}`;
  
  const subject = subjects[Math.floor(Math.random() * subjects.length)];
  let result = subject.subject_template;
  
  result = result.replace(/\[Focus Area\]/g, focusAreas[0] || 'Discussion');
  
  return result;
}